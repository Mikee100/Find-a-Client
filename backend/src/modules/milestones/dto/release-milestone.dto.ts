import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReleaseMilestoneDto {
  @IsOptional()
  @IsString({ message: "Note must be a string." })
  @MaxLength(1000, { message: "Note cannot exceed 1000 characters." })
  note?: string;
}
