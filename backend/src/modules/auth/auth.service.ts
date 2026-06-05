import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import Redis from "ioredis";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PrismaService } from "src/prisma/prisma.service";
import { toSlug } from "src/common/utils/slug.util";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { RefreshTokenDto } from "src/modules/auth/dto/refresh-token.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly redis: Redis;
  private readonly supabaseAnon: SupabaseClient;
  private readonly supabaseAdmin: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    this.redis = new Redis(this.configService.getOrThrow<string>("REDIS_URL"), { lazyConnect: true });
    this.supabaseAnon = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY")
    );
    this.supabaseAdmin = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY")
    );
  }

  /**
   * Registers a new user in Supabase Auth and local profile store.
   */
  async register(dto: RegisterDto): Promise<{ userId: string } & TokenPair> {
    const username = toSlug(dto.username);
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email: dto.email }, { username }] } });
    if (existing) {
      throw new HttpException("Email or username already exists", HttpStatus.CONFLICT);
    }

    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        fullName: dto.fullName,
        username
      }
    });

    if (error || !data.user) {
      throw new HttpException(error?.message ?? "Registration failed", HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.create({
      data: {
        id: data.user.id,
        email: dto.email,
        username,
        fullName: dto.fullName,
        role: UserRole.DEVELOPER,
        skills: []
      }
    });

    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    return { userId: user.id, ...tokenPair };
  }

  /**
   * Logs in with Supabase Auth and returns app JWT tokens.
   */
  async login(dto: LoginDto): Promise<TokenPair> {
    const { data, error } = await this.supabaseAnon.auth.signInWithPassword({
      email: dto.email,
      password: dto.password
    });

    if (error || !data.user) {
      throw new HttpException(error?.message ?? "Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({ where: { id: data.user.id } });
    if (!user) {
      throw new HttpException("User profile not found", HttpStatus.NOT_FOUND);
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  /**
   * Rotates refresh token and issues new pair.
   */
  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const payload = await this.jwtService.verifyAsync<{ sub: string }>(dto.refreshToken, {
      secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
    });

    const stored = await this.redis.get(`refresh:${payload.sub}`);
    if (stored !== dto.refreshToken) {
      throw new HttpException("Invalid refresh token", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  /**
   * Logs out user by blacklisting and deleting refresh token.
   */
  async logout(refreshToken: string): Promise<{ loggedOut: true }> {
    const payload = await this.jwtService.verifyAsync<{ sub: string; exp: number }>(refreshToken, {
      secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
    });
    await this.redis.del(`refresh:${payload.sub}`);
    const ttlSeconds = Math.max(payload.exp - Math.floor(Date.now() / 1000), 1);
    await this.redis.set(`blacklist:${refreshToken}`, "1", "EX", ttlSeconds);
    return { loggedOut: true };
  }

  /**
   * Builds provider auth URL for frontend redirect flow.
   */
  getOAuthRedirect(provider: "google" | "github"): { url: string } {
    const url = `${this.configService.getOrThrow<string>("SUPABASE_URL")}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(
      `${this.configService.getOrThrow<string>("FRONTEND_URL")}/auth/callback`
    )}`;
    return { url };
  }

  private async issueTokens(userId: string, email: string, role: UserRole): Promise<TokenPair> {
    const accessTtl = this.parseTtlToSeconds(this.configService.get<string>("JWT_ACCESS_TTL", "15m"));
    const refreshTtl = this.parseTtlToSeconds(this.configService.get<string>("JWT_REFRESH_TTL", "7d"));

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
        expiresIn: accessTtl
      }
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: refreshTtl
      }
    );

    await this.redis.set(`refresh:${userId}`, refreshToken, "EX", 60 * 60 * 24 * 7);
    return { accessToken, refreshToken };
  }

  private parseTtlToSeconds(value: string): number {
    const normalized = value.trim().toLowerCase();
    if (/^\d+$/.test(normalized)) {
      return Number(normalized);
    }

    const unit = normalized.slice(-1);
    const amount = Number(normalized.slice(0, -1));
    if (!Number.isFinite(amount)) {
      return 900;
    }

    if (unit === "s") {
      return amount;
    }
    if (unit === "m") {
      return amount * 60;
    }
    if (unit === "h") {
      return amount * 60 * 60;
    }
    if (unit === "d") {
      return amount * 60 * 60 * 24;
    }

    return 900;
  }
}
