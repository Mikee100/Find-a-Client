import { IsArray, IsOptional, IsString } from "class-validator";

export class AiProposalTemplateDto {
  @IsString()
  brief!: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  budgetRange?: string;

  @IsOptional()
  @IsString()
  timelinePreference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
