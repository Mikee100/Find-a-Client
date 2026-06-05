import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { MessagesController } from "src/modules/messages/messages.controller";
import { MessagesService } from "src/modules/messages/messages.service";

@Module({
  imports: [ConfigModule],
  controllers: [MessagesController],
  providers: [MessagesService, PrismaService]
})
export class MessagesModule {}
