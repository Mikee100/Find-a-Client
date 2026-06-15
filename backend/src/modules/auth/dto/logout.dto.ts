import { IsString, MinLength } from "class-validator";

export class LogoutDto {
  @IsString({ message: "Refresh token must be a string." })
  @MinLength(10, { message: "Refresh token is invalid." })
  refreshToken!: string;
}
