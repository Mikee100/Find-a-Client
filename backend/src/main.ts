import "reflect-metadata";
import { WebSocket } from "ws";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import * as compression from "compression";
import { AppModule } from "src/app.module";

if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function originMatchesPattern(origin: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    return origin === pattern;
  }

  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
  const regex = new RegExp(`^${escapedPattern}$`);
  return regex.test(origin);
}

async function bootstrap(): Promise<void> {
  const quietStartupLogs = process.env.QUIET_STARTUP_LOGS !== "false";
  const fallbackOriginPatterns = ["http://localhost:3060", "https://find-a-client.vercel.app"];
  const allowedOriginPatterns = [
    ...(process.env.FRONTEND_URLS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    process.env.FRONTEND_URL?.trim() ?? "",
    ...fallbackOriginPatterns
  ]
    .map((value) => normalizeOrigin(value))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);

  const app = await NestFactory.create(AppModule, {
    logger: quietStartupLogs ? ["error", "warn"] : ["log", "error", "warn", "debug", "verbose"]
  });

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOriginPatterns.some((pattern) => originMatchesPattern(normalizedOrigin, pattern));

      if (isAllowed) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Find a Client API")
    .setDescription("API documentation for Find a Client backend")
    .setVersion("1.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument, {
    jsonDocumentUrl: "api/docs-json"
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  console.log("[startup] Nest started successfully");
  console.log(`[startup] Listening on http://localhost:${port}`);
}

void bootstrap();
