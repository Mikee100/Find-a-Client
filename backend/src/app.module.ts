import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import cloudinaryConfig from "src/config/cloudinary.config";
import databaseConfig from "src/config/database.config";
import jwtConfig from "src/config/jwt.config";
import redisConfig from "src/config/redis.config";
import { GlobalExceptionFilter } from "src/common/filters/global-exception.filter";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { LoggingInterceptor } from "src/common/interceptors/logging.interceptor";
import { ResponseTransformInterceptor } from "src/common/interceptors/response-transform.interceptor";
import { QueueModule } from "src/queue/queue.module";
import { MediaProcessor, NotificationProcessor, ReviewProcessor } from "src/queue/queue.processors";
import { AdminModule } from "src/modules/admin/admin.module";
import { AuthModule } from "src/modules/auth/auth.module";
import { HealthController } from "src/modules/health.controller";
import { MediaModule } from "src/modules/media/media.module";
import { MessagesModule } from "src/modules/messages/messages.module";
import { NotificationsModule } from "src/modules/notifications/notifications.module";
import { ProjectsModule } from "src/modules/projects/projects.module";
import { ReviewsModule } from "src/modules/reviews/reviews.module";
import { SearchModule } from "src/modules/search/search.module";
import { UsersModule } from "src/modules/users/users.module";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, cloudinaryConfig, jwtConfig]
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100
      }
    ]),
    QueueModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    MediaModule,
    MessagesModule,
    NotificationsModule,
    ReviewsModule,
    SearchModule,
    AdminModule
  ],
  providers: [
    MediaProcessor,
    NotificationProcessor,
    ReviewProcessor,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter
    }
  ]
})
export class AppModule {}
