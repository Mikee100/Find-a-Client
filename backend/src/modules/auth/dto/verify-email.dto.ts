import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class VerifyEmailDto {
  @IsString({ message: "Token must be a string." })
  @IsNotEmpty({ message: "Token is required." })
  @MinLength(20, { message: "Token is invalid." })
  token!: string;
}
