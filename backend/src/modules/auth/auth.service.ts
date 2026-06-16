import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { WebSocket } from "ws";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";
import { PrismaService } from "src/prisma/prisma.service";
import { toSlug } from "src/common/utils/slug.util";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { RefreshTokenDto } from "src/modules/auth/dto/refresh-token.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";

const wsTransport = WebSocket as unknown as never;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
  identifier?: string;
}

@Injectable()
export class AuthService {
  private readonly authRateLimitStore = new Map<string, { count: number; resetAt: number }>();
  private readonly supabaseAnon: SupabaseClient;
  private readonly supabaseAdmin: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    this.supabaseAnon = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      { realtime: { transport: wsTransport } }
    );
    this.supabaseAdmin = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
      { realtime: { transport: wsTransport } }
    );
  }

  getRoleFromAccessToken(accessToken: string): UserRole {
    try {
      const payload = this.jwtService.verify<{ role: UserRole }>(accessToken, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET")
      });
      return payload.role;
    } catch {
      return USER_ROLE.DEVELOPER;
    }
  }

  /**
   * Registers a new user in Supabase Auth and local profile store.
   */
  async register(dto: RegisterDto, context: AuthRequestContext = {}): Promise<{ userId: string; role: UserRole } & TokenPair> {
    this.assertSupabaseConfigured();
    this.assertRateLimit("register", `${context.ipAddress ?? "unknown"}:${dto.email.toLowerCase()}`, 10, 60_000);

    const username = toSlug(dto.username);
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email: dto.email }, { username }] } });
    if (existing) {
      await this.logAuthEvent("register_conflict", false, context, { email: dto.email });
      throw new HttpException("Email or username already exists", HttpStatus.CONFLICT);
    }

    let data: Awaited<ReturnType<typeof this.supabaseAdmin.auth.admin.createUser>>["data"];
    let error: Awaited<ReturnType<typeof this.supabaseAdmin.auth.admin.createUser>>["error"];
    try {
      const response = await this.supabaseAdmin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          fullName: dto.fullName,
          username,
          role: dto.role
        }
      });
      data = response.data;
      error = response.error;
    } catch (caughtError) {
      this.throwMappedSupabaseError(caughtError);
    }

    if (error || !data.user) {
      await this.logAuthEvent("register_failed", false, context, {
        email: dto.email,
        metadata: { reason: this.mapSupabaseMessage(error?.message) ?? "Registration failed" }
      });
      throw new HttpException(this.mapSupabaseMessage(error?.message) ?? "Registration failed", HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.create({
      data: {
        id: data.user.id,
        email: dto.email,
        username,
        fullName: dto.fullName,
        role: dto.role,
        skills: []
      }
    });

    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    await this.logAuthEvent("register_success", true, context, { userId: user.id, email: user.email });
    return { userId: user.id, role: user.role, ...tokenPair };
  }

  /**
   * Logs in with Supabase Auth and returns app JWT tokens.
   */
  async login(dto: LoginDto, context: AuthRequestContext = {}): Promise<TokenPair> {
    this.assertSupabaseConfigured();
    this.assertRateLimit("login", `${context.ipAddress ?? "unknown"}:${dto.email.toLowerCase()}`, 8, 60_000);

    let data: Awaited<ReturnType<typeof this.supabaseAnon.auth.signInWithPassword>>["data"];
    let error: Awaited<ReturnType<typeof this.supabaseAnon.auth.signInWithPassword>>["error"];
    try {
      const response = await this.supabaseAnon.auth.signInWithPassword({
        email: dto.email,
        password: dto.password
      });
      data = response.data;
      error = response.error;
    } catch (caughtError) {
      this.throwMappedSupabaseError(caughtError);
    }

    if (error || !data.user) {
      await this.logAuthEvent("login_failed", false, context, {
        email: dto.email,
        metadata: { reason: this.mapSupabaseMessage(error?.message) ?? "Invalid credentials" }
      });
      throw new HttpException(this.mapSupabaseMessage(error?.message) ?? "Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({ where: { id: data.user.id } });
    if (!user) {
      await this.logAuthEvent("login_failed", false, context, {
        email: dto.email,
        metadata: { reason: "User profile not found" }
      });
      throw new HttpException("User profile not found", HttpStatus.NOT_FOUND);
    }

    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    await this.logAuthEvent("login_success", true, context, { userId: user.id, email: user.email });
    return tokenPair;
  }

  /**
   * Rotates refresh token and issues new pair.
   */
  async refresh(dto: RefreshTokenDto, context: AuthRequestContext = {}): Promise<TokenPair> {
    this.assertRateLimit("refresh", context.ipAddress ?? "unknown", 30, 60_000);

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
      });
    } catch {
      await this.logAuthEvent("refresh_failed", false, context, { metadata: { reason: "Token verification failed" } });
      throw new HttpException("Invalid refresh token", HttpStatus.UNAUTHORIZED);
    }

    let session;
    try {
      session = await this.prisma.refreshSession.findUnique({ where: { userId: payload.sub } });
    } catch (error) {
      this.throwAuthStorageError(error);
    }
    const tokenHash = this.hashToken(dto.refreshToken);
    if (!session || session.revokedAt || session.tokenHash !== tokenHash || session.expiresAt < new Date()) {
      await this.logAuthEvent("refresh_failed", false, context, {
        userId: payload.sub,
        metadata: { reason: "Session invalid or expired" }
      });
      throw new HttpException("Invalid refresh token", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      await this.logAuthEvent("refresh_failed", false, context, {
        userId: payload.sub,
        metadata: { reason: "User not found" }
      });
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    await this.logAuthEvent("refresh_success", true, context, { userId: user.id, email: user.email });
    return tokenPair;
  }

  /**
   * Logs out user by blacklisting and deleting refresh token.
   */
  async logout(refreshToken: string, context: AuthRequestContext = {}): Promise<{ loggedOut: true }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
      });
      let session;
      try {
        session = await this.prisma.refreshSession.findUnique({ where: { userId: payload.sub } });
      } catch (error) {
        this.throwAuthStorageError(error);
      }
      if (session && session.tokenHash === this.hashToken(refreshToken)) {
        try {
          await this.prisma.refreshSession.update({
            where: { userId: payload.sub },
            data: { revokedAt: new Date() }
          });
        } catch (error) {
          this.throwAuthStorageError(error);
        }
      }

      await this.logAuthEvent("logout_success", true, context, { userId: payload.sub });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      await this.logAuthEvent("logout_invalid_token", false, context, {
        metadata: { reason: "Token verification failed during logout" }
      });
    }

    return { loggedOut: true };
  }

  /**
   * Revokes all active refresh sessions for a user.
   */
  async logoutAll(userId: string, context: AuthRequestContext = {}): Promise<{ loggedOutAll: true }> {
    try {
      await this.prisma.refreshSession.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
      await this.logAuthEvent("logout_all_success", true, context, { userId });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.throwAuthStorageError(error);
    }

    return { loggedOutAll: true };
  }

  /**
   * Builds provider auth URL for frontend redirect flow.
   */
  getOAuthRedirect(provider: "google" | "github"): { url: string } {
    this.assertSupabaseConfigured();

    const url = `${this.configService.getOrThrow<string>("SUPABASE_URL")}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(
      `${this.configService.getOrThrow<string>("FRONTEND_URL")}/auth/callback`
    )}`;
    return { url };
  }

  private assertSupabaseConfigured(): void {
    const supabaseUrl = this.configService.getOrThrow<string>("SUPABASE_URL");
    const anonKey = this.configService.getOrThrow<string>("SUPABASE_ANON_KEY");
    const serviceRoleKey = this.configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY");

    const looksLikePlaceholder =
      supabaseUrl.includes("your-project.supabase.co") ||
      anonKey.includes("placeholder") ||
      serviceRoleKey.includes("placeholder") ||
      anonKey.trim() === "" ||
      serviceRoleKey.trim() === "";

    if (looksLikePlaceholder) {
      throw new HttpException(
        "Supabase auth is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  private mapSupabaseMessage(message?: string): string | undefined {
    if (!message) {
      return undefined;
    }

    if (message.includes("ENOTFOUND") || message.includes("fetch failed")) {
      return "Cannot reach Supabase. Check SUPABASE_URL and your network connection.";
    }

    return message;
  }

  private throwMappedSupabaseError(caughtError: unknown): never {
    if (caughtError instanceof HttpException) {
      throw caughtError;
    }

    const message = caughtError instanceof Error ? caughtError.message : "Supabase request failed";
    const mapped = this.mapSupabaseMessage(message) ?? "Supabase request failed";
    throw new HttpException(mapped, HttpStatus.BAD_GATEWAY);
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

    try {
      await this.prisma.refreshSession.upsert({
        where: { userId },
        create: {
          userId,
          tokenHash: this.hashToken(refreshToken),
          expiresAt: new Date(Date.now() + refreshTtl * 1000)
        },
        update: {
          tokenHash: this.hashToken(refreshToken),
          expiresAt: new Date(Date.now() + refreshTtl * 1000),
          revokedAt: null
        }
      });
    } catch (error) {
      this.throwAuthStorageError(error);
    }

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private assertRateLimit(scope: string, key: string, limit: number, ttlMs: number): void {
    const now = Date.now();
    const compound = `${scope}:${key}`;
    const existing = this.authRateLimitStore.get(compound);

    if (!existing || existing.resetAt <= now) {
      this.authRateLimitStore.set(compound, { count: 1, resetAt: now + ttlMs });
      return;
    }

    if (existing.count >= limit) {
      throw new HttpException("Too many authentication attempts. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
    this.authRateLimitStore.set(compound, existing);
  }

  private async logAuthEvent(
    event: string,
    success: boolean,
    context: AuthRequestContext,
    details?: { userId?: string; email?: string; metadata?: Prisma.InputJsonValue }
  ): Promise<void> {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          userId: details?.userId,
          email: details?.email,
          event,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          success,
          metadata: details?.metadata
        }
      });
    } catch {
      // Avoid blocking auth flow on logging failure.
    }
  }

  private throwAuthStorageError(error: unknown): never {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      (error as { code: string }).code === "P2021"
    ) {
      throw new HttpException(
        "Authentication storage is not ready. Run backend database migrations before using auth endpoints.",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    throw new HttpException("Authentication storage error", HttpStatus.INTERNAL_SERVER_ERROR);
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
