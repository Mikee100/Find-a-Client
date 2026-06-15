import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateThreadDto {
  @IsUUID("4", { message: "recipientId must be a valid uuid." })
  recipientId!: string;

  @IsOptional()
  @IsUUID("4", { message: "projectId must be a valid uuid." })
  projectId?: string;

  @IsOptional()
  @IsString({ message: "Initial message must be a string." })
  initialMessage?: string;
}
