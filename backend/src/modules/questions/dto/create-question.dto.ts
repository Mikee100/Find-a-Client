import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateQuestionDto {
  @IsString({ message: "Question content must be a string." })
  @MinLength(3, { message: "Question must be at least 3 characters." })
  @MaxLength(1000, { message: "Question cannot exceed 1000 characters." })
  content!: string;
}
