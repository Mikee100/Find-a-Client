import { IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @IsString({ message: "Message content must be a string." })
  @MinLength(1, { message: "Message cannot be empty." })
  @MaxLength(5000, { message: "Message cannot exceed 5000 chars." })
  content!: string;
}
