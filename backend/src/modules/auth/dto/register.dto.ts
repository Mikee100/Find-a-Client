import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from "class-validator";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";

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

  @IsIn([USER_ROLE.DEVELOPER, USER_ROLE.CLIENT], { message: "Role must be DEVELOPER or CLIENT." })
  role!: UserRole;
}
