import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationsController } from "src/modules/notifications/notifications.controller";
import { NotificationsService } from "src/modules/notifications/notifications.service";

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
