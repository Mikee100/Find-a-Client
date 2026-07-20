import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateMilestoneDto {
  @IsString({ message: "Title must be a string." })
  @MaxLength(160, { message: "Title cannot exceed 160 characters." })
  title!: string;

  @Type(() => Number)
  @IsNumber({}, { message: "Amount must be numeric." })
  @Min(1, { message: "Amount must be at least 1." })
  amount!: number;

  @IsOptional()
  @IsString({ message: "Currency must be a string." })
  @MaxLength(3, { message: "Currency must be a 3-letter code." })
  currency?: string;

  @IsOptional()
  @IsDateString({}, { message: "Due date must be a valid ISO date string." })
  dueDate?: string;
}
