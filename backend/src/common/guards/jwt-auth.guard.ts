import { ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "src/common/decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ method: string; headers: Record<string, string | string[] | undefined> }>();
    const method = (request.method ?? "GET").toUpperCase();
    const requiresCsrf = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

    if (requiresCsrf) {
      const csrfCookieName = this.configService.get<string>("AUTH_CSRF_COOKIE_NAME", "csrf_token");
      const rawCookie = request.headers.cookie;
      let csrfCookie: string | null = null;
      if (typeof rawCookie === "string") {
        for (const chunk of rawCookie.split(";")) {
          const part = chunk.trim();
          const token = `${csrfCookieName}=`;
          if (part.startsWith(token)) {
            csrfCookie = decodeURIComponent(part.slice(token.length));
            break;
          }
        }
      }

      const csrfHeader = request.headers["x-csrf-token"];
      const headerValue = typeof csrfHeader === "string" ? csrfHeader : Array.isArray(csrfHeader) ? csrfHeader[0] : null;

      if (!csrfCookie || !headerValue || csrfCookie !== headerValue) {
        throw new ForbiddenException("Invalid CSRF token");
      }
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
