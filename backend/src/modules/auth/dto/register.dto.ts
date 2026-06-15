import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "A valid email is required." })
  email!: string;

  @IsString({ message: "Password must be a string." })
  @MinLength(8, { message: "Password must be at least 8 characters." })
  password!: string;

  @IsString({ message: "Full name must be a string." })
  @IsNotEmpty({ message: "Full name is required." })
  fullName!: string;

  @IsString({ message: "Username must be a string." })
  @IsNotEmpty({ message: "Username is required." })
  username!: string;
}
