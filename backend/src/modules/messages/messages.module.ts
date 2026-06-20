import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MediaModule } from "src/modules/media/media.module";
import { MessagesController } from "src/modules/messages/messages.controller";
import { MessagesService } from "src/modules/messages/messages.service";
import { NotificationsModule } from "src/modules/notifications/notifications.module";

@Module({
  imports: [ConfigModule, NotificationsModule, MediaModule],
  controllers: [MessagesController],
  providers: [MessagesService]
})
export class MessagesModule {}
