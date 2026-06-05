import { NotificationType } from "@prisma/client";
import { IsEnum, IsObject, IsUUID } from "class-validator";

export class DispatchNotificationDto {
  @IsUUID("4", { message: "User id must be a valid uuid." })
  userId!: string;

  @IsEnum(NotificationType, { message: "Notification type is invalid." })
  type!: NotificationType;

  @IsObject({ message: "Payload must be an object." })
  payload!: Record<string, unknown>;
}
