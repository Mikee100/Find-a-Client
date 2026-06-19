import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class SubmitProposalDto {
  @IsString({ message: "Proposal message must be a string." })
  @MaxLength(3000, { message: "Proposal message cannot exceed 3000 characters." })
  proposalMessage!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Proposal amount must be numeric." })
  @Min(0, { message: "Proposal amount cannot be negative." })
  proposalAmount?: number;

  @IsOptional()
  @IsString({ message: "Proposal currency must be a string." })
  @MaxLength(3, { message: "Proposal currency must be a 3-letter code." })
  proposalCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Proposal timeline days must be numeric." })
  @Min(1, { message: "Proposal timeline days must be at least 1." })
  proposalTimelineDays?: number;
}
