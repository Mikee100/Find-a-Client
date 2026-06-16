import { IsIn, IsObject, IsUUID } from "class-validator";
import { NOTIFICATION_TYPE, NotificationType } from "src/common/constants/domain-enums.constant";

export class DispatchNotificationDto {
  @IsUUID("4", { message: "User id must be a valid uuid." })
  userId!: string;

  @IsIn(Object.values(NOTIFICATION_TYPE), { message: "Notification type is invalid." })
  type!: NotificationType;

  @IsObject({ message: "Payload must be an object." })
  payload!: Record<string, unknown>;
}
