import { Transform } from "class-transformer";
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AVAILABILITY_STATUS, EXPERIENCE_LEVEL } from "src/common/constants/domain-enums.constant";

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

export class SearchDevelopersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsIn(Object.values(EXPERIENCE_LEVEL), { message: "Experience level is invalid." })
  experienceLevel?: (typeof EXPERIENCE_LEVEL)[keyof typeof EXPERIENCE_LEVEL];

  @IsOptional()
  @IsIn(Object.values(AVAILABILITY_STATUS), { message: "Availability status is invalid." })
  availabilityStatus?: (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
