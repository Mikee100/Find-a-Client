import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "A valid email is required." })
  email!: string;

  @IsString({ message: "Password must be a string." })
  @MinLength(8, { message: "Password must be at least 8 characters." })
  password!: string;
}
