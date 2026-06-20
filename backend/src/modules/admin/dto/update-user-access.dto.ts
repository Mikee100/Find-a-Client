import { IsBoolean } from "class-validator";

export class UpdateUserAccessDto {
  @IsBoolean({ message: "disabled must be a boolean." })
  disabled!: boolean;
}
