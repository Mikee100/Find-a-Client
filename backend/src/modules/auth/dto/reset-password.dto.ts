import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString({ message: "Token must be a string." })
  @IsNotEmpty({ message: "Token is required." })
  @MinLength(20, { message: "Token is invalid." })
  token!: string;

  @IsString({ message: "New password must be a string." })
  @MinLength(8, { message: "New password must be at least 8 characters." })
  newPassword!: string;
}
