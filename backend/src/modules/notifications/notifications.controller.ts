import { Body, Controller, Get, Post, Put, Query } from "@nestjs/common";
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

  @Put("read-all")
  readAll(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.readAll(user.sub);
  }

  @Post("dispatch")
  dispatch(@Body() dto: DispatchNotificationDto) {
    return this.notificationsService.dispatch(dto.userId, dto.type, dto.payload);
  }
}
