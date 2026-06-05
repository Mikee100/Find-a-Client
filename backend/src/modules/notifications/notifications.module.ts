import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueueModule } from "src/queue/queue.module";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationsController } from "src/modules/notifications/notifications.controller";
import { NotificationsService } from "src/modules/notifications/notifications.service";

@Module({
  imports: [ConfigModule, QueueModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PrismaService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
