import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const cookieExtractor = (request: Request): string | null => {
      const raw = request?.headers?.cookie;
      if (!raw) {
        return null;
      }

      const token = "access_token=";
      for (const chunk of raw.split(";")) {
        const part = chunk.trim();
        if (part.startsWith(token)) {
          return decodeURIComponent(part.slice(token.length));
        }
      }

      return null;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET")
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
