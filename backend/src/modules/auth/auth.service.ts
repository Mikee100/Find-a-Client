import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AuthActionTokenType, Prisma, User } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "crypto";
import * as RedisModule from "ioredis";
import { WebSocket } from "ws";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { PrismaService } from "src/prisma/prisma.service";
import { toSlug } from "src/common/utils/slug.util";
import { ChangePasswordDto } from "src/modules/auth/dto/change-password.dto";
import { ForgotPasswordDto } from "src/modules/auth/dto/forgot-password.dto";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { RefreshTokenDto } from "src/modules/auth/dto/refresh-token.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";
import { ResetPasswordDto } from "src/modules/auth/dto/reset-password.dto";
import { VerifyEmailDto } from "src/modules/auth/dto/verify-email.dto";

const wsTransport = WebSocket as unknown as never;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends TokenPair {
  supabaseAccessToken: string | null;
  supabaseRefreshToken: string | null;
}

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
  identifier?: string;
}

export interface OAuthRedirectOptions {
  next?: string;
  intent?: string;
}

export interface OAuthReadinessReport {
  ready: boolean;
  checks: {
    supabaseUrlConfigured: boolean;
    supabaseAnonKeyConfigured: boolean;
    supabaseServiceRoleConfigured: boolean;
    frontendUrlConfigured: boolean;
  };
  expected: {
    frontendCallbackUrl: string;
    supabaseProviderRedirectUri: string;
  };
  warnings: string[];
}

type SupabaseIdentity = {
  provider?: string;
  identity_data?: {
    user_name?: string;
    preferred_username?: string;
    full_name?: string;
    avatar_url?: string;
    email?: string;
    [key: string]: unknown;
  };
};

type SupabaseUserMetadata = {
  role?: string;
  username?: string;
  user_name?: string;
  preferred_username?: string;
  full_name?: string;
  name?: string;
  [key: string]: unknown;
};

const AUTH_ACTION_TOKEN_TYPE = {
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  PASSWORD_RESET: "PASSWORD_RESET"
} as const;

type AuthActionTokenTypeValue = (typeof AUTH_ACTION_TOKEN_TYPE)[keyof typeof AUTH_ACTION_TOKEN_TYPE];

@Injectable()
export class AuthService {
  private readonly authRateLimitStore = new Map<string, { count: number; resetAt: number }>();
  private readonly redisRateLimitClient?: {
    incr: (key: string) => Promise<number>;
    pexpire: (key: string, ttl: number) => Promise<number>;
  };
  private readonly supabaseAnon: SupabaseClient;
  private readonly supabaseAdmin: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService
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

    const redisUrl = this.configService.get<string>("REDIS_URL", "").trim();
    if (redisUrl) {
      const redisCtor = (RedisModule as unknown as { default?: new (...args: unknown[]) => unknown; Redis?: new (...args: unknown[]) => unknown }).default
        ?? (RedisModule as unknown as { Redis?: new (...args: unknown[]) => unknown }).Redis;
      if (redisCtor) {
        this.redisRateLimitClient = new (redisCtor as new (url: string, options: Record<string, unknown>) => {
          incr: (key: string) => Promise<number>;
          pexpire: (key: string, ttl: number) => Promise<number>;
        })(redisUrl, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: false
        });
      }
    }
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
   * Registers a new user and sends an email verification link.
   */
  async register(dto: RegisterDto, context: AuthRequestContext = {}): Promise<{ userId: string; role: UserRole; verificationRequired: true }> {
    this.assertSupabaseConfigured();
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = toSlug(dto.username);

    if (!normalizedUsername) {
      throw new HttpException("Username is invalid. Use letters, numbers, and hyphens.", HttpStatus.BAD_REQUEST);
    }

    await this.assertRateLimit("register", `${context.ipAddress ?? "unknown"}:${normalizedEmail}`, 10, 60_000);
    this.assertStrongPassword(dto.password, "Password");

    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] } });
    if (existing) {
      const isEmailConflict = existing.email.toLowerCase() === normalizedEmail;
      await this.logAuthEvent("register_conflict", false, context, { email: normalizedEmail });
      throw new HttpException(isEmailConflict ? "Email already exists" : "Username already exists", HttpStatus.CONFLICT);
    }

    let data: Awaited<ReturnType<typeof this.supabaseAdmin.auth.admin.createUser>>["data"];
    let error: Awaited<ReturnType<typeof this.supabaseAdmin.auth.admin.createUser>>["error"];
    try {
      const response = await this.supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          fullName: dto.fullName,
          username: normalizedUsername,
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
        email: normalizedEmail,
        metadata: { reason: this.mapSupabaseMessage(error?.message) ?? "Registration failed" }
      });
      throw new HttpException(this.mapSupabaseMessage(error?.message) ?? "Registration failed", HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.create({
      data: {
        id: data.user.id,
        email: normalizedEmail,
        username: normalizedUsername,
        fullName: dto.fullName,
        role: dto.role,
        isVerified: false,
        skills: []
      }
    });

    await this.sendVerificationEmail(user, context);
    await this.logAuthEvent("register_success", true, context, { userId: user.id, email: user.email });
    return { userId: user.id, role: user.role, verificationRequired: true };
  }

  /**
   * Logs in with Supabase Auth and returns app JWT tokens.
   */
  async login(dto: LoginDto, context: AuthRequestContext = {}): Promise<LoginResult> {
    this.assertSupabaseConfigured();
    await this.assertRateLimit("login", `${context.ipAddress ?? "unknown"}:${dto.email.toLowerCase()}`, 8, 60_000);

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

    if (!user.isVerified) {
      await this.logAuthEvent("login_blocked_unverified", false, context, {
        userId: user.id,
        email: user.email,
        metadata: { reason: "Email verification required" }
      });
      throw new HttpException("Please verify your email before logging in.", HttpStatus.FORBIDDEN);
    }

    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    await this.logAuthEvent("login_success", true, context, { userId: user.id, email: user.email });
    return {
      ...tokenPair,
      supabaseAccessToken: data.session?.access_token ?? null,
      supabaseRefreshToken: data.session?.refresh_token ?? null
    };
  }

  /**
   * Verifies account using one-time token and signs user in.
   */
  async verifyEmail(dto: VerifyEmailDto, context: AuthRequestContext = {}): Promise<{ role: UserRole } & TokenPair> {
    await this.assertRateLimit("verify_email", context.ipAddress ?? "unknown", 20, 60_000);

    const user = await this.consumeAuthActionToken(dto.token, AUTH_ACTION_TOKEN_TYPE.EMAIL_VERIFICATION);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true }
    });

    const tokenPair = await this.issueTokens(updatedUser.id, updatedUser.email, updatedUser.role);
    await this.logAuthEvent("verify_email_success", true, context, {
      userId: updatedUser.id,
      email: updatedUser.email
    });

    return { role: updatedUser.role, ...tokenPair };
  }

  /**
   * Resends verification link to unverified users.
   */
  async resendVerification(email: string, context: AuthRequestContext = {}): Promise<{ sent: true }> {
    this.assertSupabaseConfigured();
    await this.assertRateLimit("resend_verification", `${context.ipAddress ?? "unknown"}:${email.toLowerCase()}`, 6, 60_000);

    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.isVerified) {
      return { sent: true };
    }

    await this.sendVerificationEmail(user, context);
    await this.logAuthEvent("verify_email_resent", true, context, { userId: user.id, email: user.email });
    return { sent: true };
  }

  /**
   * Starts forgot-password flow by sending a reset link.
   */
  async forgotPassword(dto: ForgotPasswordDto, context: AuthRequestContext = {}): Promise<{ sent: true }> {
    this.assertSupabaseConfigured();
    await this.assertRateLimit("forgot_password", `${context.ipAddress ?? "unknown"}:${dto.email.toLowerCase()}`, 6, 60_000);

    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      return { sent: true };
    }

    const rawToken = await this.createAuthActionToken(user.id, AUTH_ACTION_TOKEN_TYPE.PASSWORD_RESET, this.getPasswordResetTtlSeconds());
    const resetUrl = this.buildActionUrl(this.configService.get<string>("AUTH_RESET_PASSWORD_PATH", "/reset-password"), rawToken);

    await this.notificationsService.sendPasswordResetEmail(user.email, user.fullName, resetUrl);
    await this.logAuthEvent("forgot_password_sent", true, context, { userId: user.id, email: user.email });
    return { sent: true };
  }

  /**
   * Completes forgot-password flow and signs user in.
   */
  async resetPassword(dto: ResetPasswordDto, context: AuthRequestContext = {}): Promise<{ role: UserRole } & TokenPair> {
    this.assertSupabaseConfigured();
    await this.assertRateLimit("reset_password", context.ipAddress ?? "unknown", 12, 60_000);
    this.assertStrongPassword(dto.newPassword, "New password");

    const user = await this.consumeAuthActionToken(dto.token, AUTH_ACTION_TOKEN_TYPE.PASSWORD_RESET);

    if (!user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true }
      });
    }

    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: dto.newPassword
    });
    if (error) {
      throw new HttpException(this.mapSupabaseMessage(error.message) ?? "Unable to reset password", HttpStatus.BAD_REQUEST);
    }

    await this.revokeRefreshSessions(user.id);
    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    await this.logAuthEvent("reset_password_success", true, context, { userId: user.id, email: user.email });
    return { role: user.role, ...tokenPair };
  }

  /**
   * Updates password for an authenticated user.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, context: AuthRequestContext = {}): Promise<{ role: UserRole } & TokenPair> {
    this.assertSupabaseConfigured();
    await this.assertRateLimit("change_password", userId, 12, 60_000);

    if (dto.currentPassword === dto.newPassword) {
      throw new HttpException("New password must be different from current password.", HttpStatus.BAD_REQUEST);
    }
    this.assertStrongPassword(dto.newPassword, "New password");

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    const signIn = await this.supabaseAnon.auth.signInWithPassword({
      email: user.email,
      password: dto.currentPassword
    });

    if (signIn.error || !signIn.data.user) {
      await this.logAuthEvent("change_password_failed", false, context, {
        userId,
        email: user.email,
        metadata: { reason: "Current password did not match" }
      });
      throw new HttpException("Current password is incorrect", HttpStatus.UNAUTHORIZED);
    }

    const update = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      password: dto.newPassword
    });

    if (update.error) {
      throw new HttpException(this.mapSupabaseMessage(update.error.message) ?? "Unable to change password", HttpStatus.BAD_REQUEST);
    }

    await this.revokeRefreshSessions(userId);
    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    await this.logAuthEvent("change_password_success", true, context, { userId: user.id, email: user.email });
    return { role: user.role, ...tokenPair };
  }

  /**
   * Rotates refresh token and issues new pair.
   */
  async refresh(dto: RefreshTokenDto, context: AuthRequestContext = {}): Promise<TokenPair> {
    await this.assertRateLimit("refresh", context.ipAddress ?? "unknown", 30, 60_000);

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
      await this.revokeRefreshSessions(userId);
      await this.logAuthEvent("logout_all_success", true, context, { userId });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.throwAuthStorageError(error);
    }

    return { loggedOutAll: true };
  }

  async completeOAuthSession(accessToken: string, context: AuthRequestContext = {}): Promise<{ role: UserRole } & TokenPair> {
    this.assertSupabaseConfigured();
    await this.assertRateLimit("oauth_session", context.ipAddress ?? "unknown", 20, 60_000);

    const { data, error } = await this.supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) {
      await this.logAuthEvent("oauth_session_failed", false, context, {
        metadata: { reason: this.mapSupabaseMessage(error?.message) ?? "Invalid OAuth access token" }
      });
      throw new HttpException(this.mapSupabaseMessage(error?.message) ?? "Invalid OAuth session", HttpStatus.UNAUTHORIZED);
    }

    const supabaseUser = data.user;
    const normalizedEmail = (supabaseUser.email ?? "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new HttpException("OAuth user is missing email", HttpStatus.BAD_REQUEST);
    }

    const metadata = (supabaseUser.user_metadata ?? {}) as SupabaseUserMetadata;
    const metadataRole = typeof metadata.role === "string" ? metadata.role.toUpperCase() : "";
    const role = Object.values(USER_ROLE).includes(metadataRole as UserRole)
      ? (metadataRole as UserRole)
      : USER_ROLE.DEVELOPER;

    let user = await this.prisma.user.findUnique({ where: { id: supabaseUser.id } });

    if (!user) {
      const baseUsername =
        toSlug(metadata.username ?? "")
        || toSlug(metadata.user_name ?? "")
        || toSlug(metadata.preferred_username ?? "")
        || toSlug(normalizedEmail.split("@")[0] ?? "")
        || "user";
      const username = await this.generateAvailableUsername(baseUsername);
      const fullName =
        (typeof metadata.full_name === "string" && metadata.full_name.trim())
        || (typeof metadata.name === "string" && metadata.name.trim())
        || normalizedEmail.split("@")[0]
        || username;

      user = await this.prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: normalizedEmail,
          username,
          fullName,
          role,
          isVerified: true,
          skills: []
        }
      });
    } else if (!user.isVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true }
      });
    }

    const tokenPair = await this.issueTokens(user.id, user.email, user.role);
    await this.logAuthEvent("oauth_session_success", true, context, {
      userId: user.id,
      email: user.email
    });

    return { role: user.role, ...tokenPair };
  }

  /**
   * Builds provider auth URL for frontend redirect flow.
   */
  getOAuthRedirect(provider: "google" | "github", options: OAuthRedirectOptions = {}): { url: string } {
    this.assertSupabaseConfigured();

    const frontendUrl = this.configService.getOrThrow<string>("FRONTEND_URL").replace(/\/+$/, "");
    const callbackUrl = new URL(`${frontendUrl}/auth/callback`);

    const normalizedNext = options.next?.trim();
    if (normalizedNext?.startsWith("/")) {
      callbackUrl.searchParams.set("next", normalizedNext);
    }

    const normalizedIntent = options.intent?.trim();
    if (normalizedIntent) {
      callbackUrl.searchParams.set("intent", normalizedIntent.slice(0, 80));
    }

    const url = `${this.configService.getOrThrow<string>("SUPABASE_URL")}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(
      callbackUrl.toString()
    )}`;
    return { url };
  }

  getOAuthReadiness(): OAuthReadinessReport {
    const supabaseUrlRaw = this.configService.get<string>("SUPABASE_URL", "").trim();
    const supabaseAnonKeyRaw = this.configService.get<string>("SUPABASE_ANON_KEY", "").trim();
    const supabaseServiceRoleRaw = this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY", "").trim();
    const frontendUrlRaw = this.configService.get<string>("FRONTEND_URL", "").trim();

    const placeholderCheck = (value: string): boolean => {
      return (
        value.length === 0
        || value.includes("placeholder")
        || value.includes("your-project.supabase.co")
        || value === "change-me"
        || value === "change-me-too"
      );
    };

    const supabaseUrlConfigured = !placeholderCheck(supabaseUrlRaw);
    const supabaseAnonKeyConfigured = !placeholderCheck(supabaseAnonKeyRaw);
    const supabaseServiceRoleConfigured = !placeholderCheck(supabaseServiceRoleRaw);
    const frontendUrlConfigured = !placeholderCheck(frontendUrlRaw);

    const normalizedFrontendUrl = frontendUrlConfigured
      ? frontendUrlRaw.replace(/\/+$/, "")
      : "http://localhost:3060";
    const normalizedSupabaseUrl = supabaseUrlConfigured
      ? supabaseUrlRaw.replace(/\/+$/, "")
      : "https://<project-ref>.supabase.co";

    const frontendCallbackUrl = `${normalizedFrontendUrl}/auth/callback`;
    const supabaseProviderRedirectUri = `${normalizedSupabaseUrl}/auth/v1/callback`;

    const warnings: string[] = [];

    if (!supabaseUrlConfigured) {
      warnings.push("SUPABASE_URL is missing or placeholder.");
    }
    if (!supabaseAnonKeyConfigured) {
      warnings.push("SUPABASE_ANON_KEY is missing or placeholder.");
    }
    if (!supabaseServiceRoleConfigured) {
      warnings.push("SUPABASE_SERVICE_ROLE_KEY is missing or placeholder.");
    }
    if (!frontendUrlConfigured) {
      warnings.push("FRONTEND_URL is missing or placeholder.");
    }

    warnings.push(
      `In Supabase Auth URL settings, include redirect URL: ${frontendCallbackUrl}`
    );
    warnings.push(
      `In Google/GitHub provider console, include callback URI: ${supabaseProviderRedirectUri}`
    );

    const ready = supabaseUrlConfigured
      && supabaseAnonKeyConfigured
      && supabaseServiceRoleConfigured
      && frontendUrlConfigured;

    return {
      ready,
      checks: {
        supabaseUrlConfigured,
        supabaseAnonKeyConfigured,
        supabaseServiceRoleConfigured,
        frontendUrlConfigured
      },
      expected: {
        frontendCallbackUrl,
        supabaseProviderRedirectUri
      },
      warnings
    };
  }

  async verifyGithubOwnership(
    userId: string,
    context: AuthRequestContext = {}
  ): Promise<{ verified: true; githubUsername: string; githubUrl: string; verifiedAt: string }> {
    this.assertSupabaseConfigured();

    const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      await this.logAuthEvent("github_verify_failed", false, context, {
        userId,
        metadata: { reason: this.mapSupabaseMessage(error?.message) ?? "Supabase user not found" }
      });
      throw new HttpException(this.mapSupabaseMessage(error?.message) ?? "Unable to load user identity", HttpStatus.BAD_GATEWAY);
    }

    const identities = (data.user.identities ?? []) as SupabaseIdentity[];
    const githubIdentity = identities.find((identity) => identity.provider === "github");

    if (!githubIdentity) {
      await this.logAuthEvent("github_verify_failed", false, context, {
        userId,
        metadata: { reason: "No linked GitHub identity" }
      });
      throw new HttpException(
        "No linked GitHub identity found. Connect GitHub first using /auth/github.",
        HttpStatus.BAD_REQUEST
      );
    }

    const githubUsername =
      githubIdentity.identity_data?.user_name?.trim()
      ?? githubIdentity.identity_data?.preferred_username?.trim()
      ?? "";

    if (!githubUsername) {
      await this.logAuthEvent("github_verify_failed", false, context, {
        userId,
        metadata: { reason: "GitHub username missing from identity data" }
      });
      throw new HttpException("Linked GitHub identity is missing username metadata.", HttpStatus.BAD_REQUEST);
    }

    const githubUrl = `https://github.com/${githubUsername}`;
    const verifiedAt = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        githubUrl,
        githubUsername,
        githubVerifiedAt: verifiedAt
      }
    });

    await this.logAuthEvent("github_verify_success", true, context, {
      userId,
      metadata: {
        githubUsername,
        githubUrl
      }
    });

    return {
      verified: true,
      githubUsername,
      githubUrl,
      verifiedAt: verifiedAt.toISOString()
    };
  }

  async verifyEmailStatus(token: string, context: AuthRequestContext = {}): Promise<{ valid: boolean; expiresAt: string | null }> {
    await this.assertRateLimit("verify_email_status", `${context.ipAddress ?? "unknown"}:${context.identifier ?? "unknown"}`, 40, 60_000);
    const tokenHash = this.hashToken(token);
    const tokenRecord = await this.findActiveAuthActionTokenRecord(tokenHash, AUTH_ACTION_TOKEN_TYPE.EMAIL_VERIFICATION);

    return {
      valid: Boolean(tokenRecord),
      expiresAt: tokenRecord ? tokenRecord.expiresAt.toISOString() : null
    };
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

  private async generateAvailableUsername(baseUsername: string): Promise<string> {
    const cleanedBase = toSlug(baseUsername) || "user";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const suffix = attempt === 0 ? "" : `-${randomBytes(2).toString("hex")}`;
      const candidate = `${cleanedBase}${suffix}`;
      const existing = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) {
        return candidate;
      }
    }

    return `${cleanedBase}-${randomUUID().slice(0, 8)}`;
  }

  private throwMappedSupabaseError(caughtError: unknown): never {
    if (caughtError instanceof HttpException) {
      throw caughtError;
    }

    const message = caughtError instanceof Error ? caughtError.message : "Supabase request failed";
    const mapped = this.mapSupabaseMessage(message) ?? "Supabase request failed";
    throw new HttpException(mapped, HttpStatus.BAD_GATEWAY);
  }

  private async sendVerificationEmail(user: User, context: AuthRequestContext): Promise<void> {
    const rawToken = await this.createAuthActionToken(
      user.id,
      AUTH_ACTION_TOKEN_TYPE.EMAIL_VERIFICATION,
      this.getVerificationTtlSeconds()
    );
    const verifyUrl = this.buildActionUrl(this.configService.get<string>("AUTH_VERIFY_EMAIL_PATH", "/verify-email"), rawToken);
    await this.notificationsService.sendAccountVerificationEmail(user.email, user.fullName, verifyUrl);
    await this.logAuthEvent("verify_email_sent", true, context, { userId: user.id, email: user.email });
  }

  private buildActionUrl(path: string, token: string): string {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3060").replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${frontendUrl}${normalizedPath}?token=${encodeURIComponent(token)}`;
  }

  private getVerificationTtlSeconds(): number {
    return this.parseTtlToSeconds(this.configService.get<string>("AUTH_VERIFY_TOKEN_TTL", "24h"));
  }

  private getPasswordResetTtlSeconds(): number {
    return this.parseTtlToSeconds(this.configService.get<string>("AUTH_RESET_TOKEN_TTL", "30m"));
  }

  private async createAuthActionToken(
    userId: string,
    tokenType: AuthActionTokenTypeValue,
    ttlSeconds: number
  ): Promise<string> {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);

    const authActionToken = this.getAuthActionTokenDelegate();

    try {
      if (authActionToken) {
        await authActionToken.deleteMany({
          where: {
            userId,
            tokenType,
            consumedAt: null
          }
        });

        await authActionToken.create({
          data: {
            userId,
            tokenType: tokenType as AuthActionTokenType,
            tokenHash,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000)
          }
        });
      } else {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        await this.prisma.$executeRawUnsafe(
          'DELETE FROM "AuthActionToken" WHERE "userId" = $1::uuid AND "tokenType" = $2::"AuthActionTokenType" AND "consumedAt" IS NULL',
          userId,
          tokenType
        );
        await this.prisma.$executeRawUnsafe(
          'INSERT INTO "AuthActionToken" ("id", "userId", "tokenType", "tokenHash", "expiresAt", "createdAt") VALUES ($1::uuid, $2::uuid, $3::"AuthActionTokenType", $4, $5, NOW())',
          randomUUID(),
          userId,
          tokenType,
          tokenHash,
          expiresAt
        );
      }
    } catch (error) {
      this.throwAuthStorageError(error);
    }

    return rawToken;
  }

  private async consumeAuthActionToken(rawToken: string, tokenType: AuthActionTokenTypeValue): Promise<User> {
    const tokenHash = this.hashToken(rawToken);
    const authActionToken = this.getAuthActionTokenDelegate();
    const tokenRecord = await this.findActiveAuthActionTokenRecord(tokenHash, tokenType);

    if (!tokenRecord) {
      throw new HttpException("Token is invalid or expired", HttpStatus.BAD_REQUEST);
    }

    let user: User | null = null;
    try {
      if (authActionToken) {
        const [, resolvedUser] = await this.prisma.$transaction([
          authActionToken.update({
            where: { id: tokenRecord.id },
            data: { consumedAt: new Date() }
          }),
          this.prisma.user.findUnique({ where: { id: tokenRecord.userId } })
        ]);
        user = resolvedUser;
      } else {
        await this.prisma.$executeRawUnsafe(
          'UPDATE "AuthActionToken" SET "consumedAt" = NOW() WHERE "id" = $1::uuid AND "consumedAt" IS NULL',
          tokenRecord.id
        );
        user = await this.prisma.user.findUnique({ where: { id: tokenRecord.userId } });
      }
    } catch (error) {
      this.throwAuthStorageError(error);
    }

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    return user;
  }

  private getAuthActionTokenDelegate(): PrismaService["authActionToken"] | null {
    const delegate = (this.prisma as PrismaService & { authActionToken?: PrismaService["authActionToken"] }).authActionToken;
    return delegate ?? null;
  }

  private async findActiveAuthActionTokenRecord(
    tokenHash: string,
    tokenType: AuthActionTokenTypeValue
  ): Promise<{ id: string; userId: string; expiresAt: Date } | null> {
    const authActionToken = this.getAuthActionTokenDelegate();

    try {
      if (authActionToken) {
        const record = await authActionToken.findFirst({
          where: {
            tokenHash,
            tokenType: tokenType as AuthActionTokenType,
            consumedAt: null,
            expiresAt: { gt: new Date() }
          },
          select: {
            id: true,
            userId: true,
            expiresAt: true
          }
        });

        return record;
      }

      const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string; userId: string; expiresAt: Date }>>(
        'SELECT "id", "userId", "expiresAt" FROM "AuthActionToken" WHERE "tokenHash" = $1 AND "tokenType" = $2::"AuthActionTokenType" AND "consumedAt" IS NULL AND "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1',
        tokenHash,
        tokenType
      );
      return rows[0] ?? null;
    } catch (error) {
      this.throwAuthStorageError(error);
    }
  }

  private async revokeRefreshSessions(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
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

  private async assertRateLimit(scope: string, key: string, limit: number, ttlMs: number): Promise<void> {
    if (this.redisRateLimitClient) {
      const now = Date.now();
      const bucket = Math.floor(now / ttlMs);
      const redisKey = `auth-rate-limit:${scope}:${key}:${bucket}`;

      try {
        const count = await this.redisRateLimitClient.incr(redisKey);
        if (count === 1) {
          await this.redisRateLimitClient.pexpire(redisKey, ttlMs);
        }

        if (count > limit) {
          throw new HttpException("Too many authentication attempts. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
        }

        return;
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
      }
    }

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

  private assertStrongPassword(value: string, label: string): void {
    if (value.length < 8) {
      throw new HttpException(`${label} must be at least 8 characters.`, HttpStatus.BAD_REQUEST);
    }

    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
      throw new HttpException(
        `${label} must include uppercase, lowercase, number, and special character.`,
        HttpStatus.BAD_REQUEST
      );
    }
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
    const errorMessage = error instanceof Error ? error.message : "";

    if (error instanceof HttpException) {
      throw error;
    }

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

    if (
      errorMessage.includes("authActionToken") ||
      errorMessage.includes("deleteMany") ||
      errorMessage.includes("create is not a function") ||
      errorMessage.includes("AuthActionToken")
    ) {
      throw new HttpException(
        "Authentication storage is not ready. Run `npm run prisma:generate`, apply migrations, and restart the backend server.",
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
