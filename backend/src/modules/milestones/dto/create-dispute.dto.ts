import { IsString, MaxLength } from "class-validator";

export class CreateDisputeDto {
  @IsString({ message: "Reason must be a string." })
  @MaxLength(4000, { message: "Reason cannot exceed 4000 characters." })
  reason!: string;
}
