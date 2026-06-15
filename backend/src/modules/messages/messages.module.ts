import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MessagesController } from "src/modules/messages/messages.controller";
import { MessagesService } from "src/modules/messages/messages.service";

@Module({
  imports: [ConfigModule],
  controllers: [MessagesController],
  providers: [MessagesService]
})
export class MessagesModule {}
