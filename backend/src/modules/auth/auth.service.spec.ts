import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "src/modules/auth/auth.service";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { PrismaService } from "src/prisma/prisma.service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: { createUser: jest.fn() },
      signInWithPassword: jest.fn()
    }
  }))
}));

describe("AuthService", () => {
  it("should be defined", () => {
    const prisma = {} as PrismaService;
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const map: Record<string, string> = {
          REDIS_URL: "",
          SUPABASE_URL: "http://localhost:54321",
          SUPABASE_ANON_KEY: "anon",
          SUPABASE_SERVICE_ROLE_KEY: "service",
          JWT_SECRET: "secret",
          JWT_REFRESH_SECRET: "refresh"
        };
        return map[key];
      }),
      get: jest.fn((key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          REDIS_URL: "",
          JWT_ACCESS_EXPIRES_IN: "15m",
          JWT_REFRESH_EXPIRES_IN: "7d"
        };

        return map[key] ?? defaultValue;
      })
    } as unknown as ConfigService;
    const jwt = { signAsync: jest.fn() } as unknown as JwtService;
    const notifications = {
      sendAccountVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn()
    } as unknown as NotificationsService;
    const service = new AuthService(prisma, config, jwt, notifications);
    expect(service).toBeDefined();
  });
});
