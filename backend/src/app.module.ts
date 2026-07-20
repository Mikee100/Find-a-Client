import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { resolve } from "path";
import cloudinaryConfig from "src/config/cloudinary.config";
import databaseConfig from "src/config/database.config";
import jwtConfig from "src/config/jwt.config";
import { CacheModule } from "src/common/cache/cache.module";
import { GlobalExceptionFilter } from "src/common/filters/global-exception.filter";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { LoggingInterceptor } from "src/common/interceptors/logging.interceptor";
import { ApiPerformanceInterceptor } from "src/common/performance/api-performance.interceptor";
import { PerformanceModule } from "src/common/performance/performance.module";
import { ResponseTransformInterceptor } from "src/common/interceptors/response-transform.interceptor";
import { AdminModule } from "src/modules/admin/admin.module";
import { AiModule } from "src/modules/ai/ai.module";
import { AuthModule } from "src/modules/auth/auth.module";
import { HealthController } from "src/modules/health.controller";
import { HireRequestsModule } from "src/modules/hire-requests/hire-requests.module";
import { MediaModule } from "src/modules/media/media.module";
import { MessagesModule } from "src/modules/messages/messages.module";
import { MilestonesModule } from "src/modules/milestones/milestones.module";
import { NotificationsModule } from "src/modules/notifications/notifications.module";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { ProjectsModule } from "src/modules/projects/projects.module";
import { ReviewsModule } from "src/modules/reviews/reviews.module";
import { SearchModule } from "src/modules/search/search.module";
import { UsersModule } from "src/modules/users/users.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { PlatformModule } from "src/modules/platform/platform.module";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, "../.env"),
      load: [databaseConfig, cloudinaryConfig, jwtConfig]
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100
      }
    ]),
    CacheModule,
    PerformanceModule,
    PrismaModule,
    PlatformModule,
    AiModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    HireRequestsModule,
    MilestonesModule,
    PaymentsModule,
    MediaModule,
    MessagesModule,
    NotificationsModule,
    ReviewsModule,
    SearchModule,
    AdminModule
  ],
  providers: [
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
      useClass: ApiPerformanceInterceptor
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
