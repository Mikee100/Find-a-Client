import "reflect-metadata";
import { WebSocket } from "ws";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "src/app.module";

if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

async function bootstrap(): Promise<void> {
  const quietStartupLogs = process.env.QUIET_STARTUP_LOGS !== "false";
  const allowedOrigins = [
    ...(process.env.FRONTEND_URLS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    process.env.FRONTEND_URL?.trim() ?? ""
  ].filter(Boolean);

  const app = await NestFactory.create(AppModule, {
    logger: quietStartupLogs ? ["error", "warn"] : ["log", "error", "warn", "debug", "verbose"]
  });

  app.use(helmet());

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
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

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  console.log("[startup] Nest started successfully");
  console.log(`[startup] Listening on http://localhost:${port}`);
}

void bootstrap();
