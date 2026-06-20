import { IsString, MinLength } from "class-validator";

export class OAuthSessionDto {
  @IsString({ message: "Access token is required." })
  @MinLength(20, { message: "Access token is invalid." })
  accessToken!: string;
}
