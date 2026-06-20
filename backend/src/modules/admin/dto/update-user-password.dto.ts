import { IsString, MinLength } from "class-validator";

export class UpdateUserPasswordDto {
  @IsString({ message: "newPassword must be a string." })
  @MinLength(8, { message: "Password must be at least 8 characters." })
  newPassword!: string;
}
