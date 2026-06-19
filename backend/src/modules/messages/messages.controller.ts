import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { CreateThreadDto } from "src/modules/messages/dto/create-thread.dto";
import { SendMessageDto } from "src/modules/messages/dto/send-message.dto";
import { MessagesService } from "src/modules/messages/messages.service";

@Controller("messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post("threads")
  createThread(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateThreadDto) {
    return this.messagesService.createThread(user.sub, dto);
  }

  @Get("threads")
  listThreads(@CurrentUser() user: CurrentUserPayload) {
    return this.messagesService.listThreads(user.sub);
  }

  @Get("quick-replies")
  quickReplies(@CurrentUser() user: CurrentUserPayload, @Query("threadId") threadId?: string) {
    return this.messagesService.getQuickReplies(user.sub, threadId);
  }

  @Get("threads/:id")
  getMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.messagesService.getThreadMessages(user.sub, id, cursor, Number(limit ?? 30));
  }

  @Post("threads/:id")
  sendMessage(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(user.sub, id, dto);
  }

  @Put("threads/:id/read")
  markRead(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.messagesService.markRead(user.sub, id);
  }
}
