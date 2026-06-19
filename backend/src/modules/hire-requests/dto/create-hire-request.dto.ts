import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateHireRequestDto {
  @IsUUID("4", { message: "Developer id must be a valid uuid." })
  developerId!: string;

  @IsOptional()
  @IsUUID("4", { message: "Project id must be a valid uuid." })
  projectId?: string;

  @IsOptional()
  @IsUUID("4", { message: "Thread id must be a valid uuid." })
  threadId?: string;

  @IsString({ message: "Brief must be a string." })
  @MaxLength(3000, { message: "Brief cannot exceed 3000 characters." })
  brief!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Budget amount must be numeric." })
  @Min(0, { message: "Budget amount cannot be negative." })
  budgetAmount?: number;

  @IsOptional()
  @IsString({ message: "Budget currency must be a string." })
  @MaxLength(3, { message: "Budget currency must be a 3-letter code." })
  budgetCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Timeline days must be numeric." })
  @Min(1, { message: "Timeline days must be at least 1." })
  timelineDays?: number;
}
