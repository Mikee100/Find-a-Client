import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class AiClientMatchDto {
  @IsString()
  brief!: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : []
  )
  requiredSkills?: string[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === "") {
      return 3;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 3;
  })
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }

    return true;
  })
  @IsBoolean()
  includeReasoning?: boolean;
}
