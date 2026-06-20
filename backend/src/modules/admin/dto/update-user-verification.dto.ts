import { IsBoolean } from "class-validator";

export class UpdateUserVerificationDto {
  @IsBoolean({ message: "isVerified must be a boolean." })
  isVerified!: boolean;
}
