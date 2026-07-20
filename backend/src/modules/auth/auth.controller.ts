import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { Throttle } from "@nestjs/throttler";
import { Public } from "src/common/decorators/public.decorator";
import { AuthService } from "src/modules/auth/auth.service";
import { ChangePasswordDto } from "src/modules/auth/dto/change-password.dto";
import { ForgotPasswordDto } from "src/modules/auth/dto/forgot-password.dto";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { OAuthSessionDto } from "src/modules/auth/dto/oauth-session.dto";
import { ResendVerificationDto } from "src/modules/auth/dto/resend-verification.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";
import { ResetPasswordDto } from "src/modules/auth/dto/reset-password.dto";
import { VerifyEmailDto } from "src/modules/auth/dto/verify-email.dto";
import { VerifyEmailStatusDto } from "src/modules/auth/dto/verify-email-status.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  private readCookie(request: Request, name: string): string | undefined {
    const raw = request.headers.cookie;
    if (!raw) {
      return undefined;
    }

    const token = `${name}=`;
    for (const chunk of raw.split(";")) {
      const part = chunk.trim();
      if (part.startsWith(token)) {
        return decodeURIComponent(part.slice(token.length));
      }
    }

    return undefined;
  }

  private readUserAgent(request: Request): string | undefined {
    const raw = request.headers["user-agent"];
    return Array.isArray(raw) ? raw[0] : raw;
  }

  private buildCookieOptions() {
    const isProduction = this.configService.get<string>("NODE_ENV", "development") === "production";
    const secureFromEnv = this.configService.get<string>("AUTH_COOKIE_SECURE");
    const secure = secureFromEnv ? secureFromEnv === "true" : isProduction;
    const sameSite = this.configService.get<"lax" | "strict" | "none">(
      "AUTH_COOKIE_SAME_SITE",
      isProduction ? "none" : "lax"
    );
    const domain = this.configService.get<string>("AUTH_COOKIE_DOMAIN", "").trim();

    return {
      httpOnly: true,
      secure,
      sameSite,
      domain: domain || undefined,
      path: "/"
    };
  }

  private applyAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
    const accessCookieName = this.configService.get<string>("AUTH_ACCESS_COOKIE_NAME", "access_token");
    const refreshCookieName = this.configService.get<string>("AUTH_REFRESH_COOKIE_NAME", "refresh_token");
    const baseOptions = this.buildCookieOptions();
    response.cookie(accessCookieName, accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000
    });
    response.cookie(refreshCookieName, refreshToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const csrfCookieName = this.configService.get<string>("AUTH_CSRF_COOKIE_NAME", "csrf_token");
    response.cookie(csrfCookieName, randomBytes(24).toString("hex"), {
      httpOnly: false,
      secure: baseOptions.secure,
      sameSite: baseOptions.sameSite,
      domain: baseOptions.domain,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }

  private clearAuthCookies(response: Response): void {
    const accessCookieName = this.configService.get<string>("AUTH_ACCESS_COOKIE_NAME", "access_token");
    const refreshCookieName = this.configService.get<string>("AUTH_REFRESH_COOKIE_NAME", "refresh_token");
    const csrfCookieName = this.configService.get<string>("AUTH_CSRF_COOKIE_NAME", "csrf_token");
    const baseOptions = this.buildCookieOptions();
    response.clearCookie(accessCookieName, baseOptions);
    response.clearCookie(refreshCookieName, baseOptions);
    response.clearCookie(csrfCookieName, {
      httpOnly: false,
      secure: baseOptions.secure,
      sameSite: baseOptions.sameSite,
      domain: baseOptions.domain,
      path: "/"
    });
  }

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post("register")
  async register(@Body() dto: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request),
      identifier: dto.email
    });
    this.clearAuthCookies(response);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("login")
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const loginResult = await this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request),
      identifier: dto.email
    });
    this.applyAuthCookies(response, loginResult.accessToken, loginResult.refreshToken);
    const role = this.authService.getRoleFromAccessToken(loginResult.accessToken);
    return {
      role,
      supabaseAccessToken: loginResult.supabaseAccessToken,
      supabaseRefreshToken: loginResult.supabaseRefreshToken
    };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("verify-email")
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.verifyEmail(dto, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request)
    });
    this.applyAuthCookies(response, result.accessToken, result.refreshToken);
    return { verified: true as const, role: result.role };
  }

  @Public()
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Post("verify-email/status")
  async verifyEmailStatus(@Body() dto: VerifyEmailStatusDto, @Req() request: Request) {
    return this.authService.verifyEmailStatus(dto.token, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request),
      identifier: dto.token.slice(0, 12)
    });
  }

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post("resend-verification")
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() request: Request) {
    return this.authService.resendVerification(dto.email, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request),
      identifier: dto.email
    });
  }

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.forgotPassword(dto, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request),
      identifier: dto.email
    });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.resetPassword(dto, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request)
    });
    this.applyAuthCookies(response, result.accessToken, result.refreshToken);
    return { reset: true as const, role: result.role };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("change-password")
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.changePassword(user.sub, dto, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request)
    });
    this.applyAuthCookies(response, result.accessToken, result.refreshToken);
    return { changed: true as const, role: result.role };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const refreshCookieName = this.configService.get<string>("AUTH_REFRESH_COOKIE_NAME", "refresh_token");
    const refreshToken = body?.refreshToken ?? this.readCookie(request, refreshCookieName);
    const tokenPair = await this.authService.refresh(
      { refreshToken: refreshToken ?? "" },
      { ipAddress: request.ip, userAgent: this.readUserAgent(request) }
    );
    this.applyAuthCookies(response, tokenPair.accessToken, tokenPair.refreshToken);
    return { refreshed: true };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("logout")
  async logout(@Body() body: { refreshToken?: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshCookieName = this.configService.get<string>("AUTH_REFRESH_COOKIE_NAME", "refresh_token");
    const refreshToken = body?.refreshToken ?? this.readCookie(request, refreshCookieName);
    if (refreshToken) {
      await this.authService.logout(refreshToken, { ipAddress: request.ip, userAgent: this.readUserAgent(request) });
    }
    this.clearAuthCookies(response);
    return { loggedOut: true as const };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("logout-all")
  async logoutAll(@CurrentUser() user: CurrentUserPayload, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logoutAll(user.sub, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request)
    });
    this.clearAuthCookies(response);
    return { loggedOutAll: true as const };
  }

  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @Get("session")
  session(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }

  @Public()
  @Throttle({ default: { limit: 16, ttl: 60_000 } })
  @Post("oauth/session")
  async completeOAuthSession(
    @Body() dto: OAuthSessionDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.completeOAuthSession(dto.accessToken, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request)
    });
    this.applyAuthCookies(response, result.accessToken, result.refreshToken);
    return { role: result.role };
  }

  @Public()
  @Get("google")
  googleOAuth(@Query("next") next?: string, @Query("intent") intent?: string) {
    return this.authService.getOAuthRedirect("google", { next, intent });
  }

  @Public()
  @Get("github")
  githubOAuth(@Query("next") next?: string, @Query("intent") intent?: string) {
    return this.authService.getOAuthRedirect("github", { next, intent });
  }

  @Public()
  @Get("oauth/health")
  oauthHealth() {
    return this.authService.getOAuthReadiness();
  }

  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Post("github/verify")
  verifyGithubOwnership(@CurrentUser() user: CurrentUserPayload, @Req() request: Request) {
    return this.authService.verifyGithubOwnership(user.sub, {
      ipAddress: request.ip,
      userAgent: this.readUserAgent(request),
      identifier: user.email
    });
  }
}
