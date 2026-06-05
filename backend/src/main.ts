import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { WinstonModule } from "nest-winston";
import winston from "winston";
import { AppModule } from "src/app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.timestamp(), winston.format.json())
        })
      ]
    })
  });

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.listen(Number(process.env.PORT ?? 4000));
}

void bootstrap();
