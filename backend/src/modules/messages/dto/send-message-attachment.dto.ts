import { IsOptional, IsString, MaxLength } from "class-validator";

export class SendMessageAttachmentDto {
  @IsOptional()
  @IsString({ message: "Attachment message must be a string." })
  @MaxLength(5000, { message: "Attachment message cannot exceed 5000 chars." })
  content?: string;
}
