import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { DispatchNotificationDto } from "src/modules/notifications/dto/dispatch-notification.dto";
import { NotificationsService } from "src/modules/notifications/notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.notificationsService.list(user.sub, cursor, Number(limit ?? 20));
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @Put("read-all")
  readAll(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.readAll(user.sub);
  }

  @Put(":id/read")
  readOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.notificationsService.readOne(user.sub, id);
  }

  @Post("dispatch")
  dispatch(@Body() dto: DispatchNotificationDto) {
    return this.notificationsService.dispatch(dto.userId, dto.type, dto.payload);
  }
}
