import { IsArray, IsIn, IsNumberString, IsOptional, IsString } from "class-validator";
import { PRICING_TYPE, PROJECT_CATEGORY, PricingType, ProjectCategory } from "src/common/constants/domain-enums.constant";

export class ListProjectsDto {
  @IsOptional()
  @IsIn(Object.values(PROJECT_CATEGORY), { message: "Category is invalid." })
  category?: ProjectCategory;

  @IsOptional()
  @IsArray({ message: "Tech stack must be an array." })
  @IsString({ each: true, message: "Each tech value must be a string." })
  techStack?: string[];

  @IsOptional()
  @IsArray({ message: "Industries must be an array." })
  @IsString({ each: true, message: "Each industry must be a string." })
  industries?: string[];

  @IsOptional()
  @IsIn(Object.values(PRICING_TYPE), { message: "Pricing type is invalid." })
  pricingType?: PricingType;

  @IsOptional()
  @IsString({ message: "Search must be a string." })
  search?: string;

  @IsOptional()
  @IsString({ message: "Sort value must be a string." })
  sortBy?: "newest" | "popular" | "price_asc" | "price_desc";

  @IsOptional()
  @IsNumberString({}, { message: "Min price must be numeric." })
  minPrice?: string;

  @IsOptional()
  @IsNumberString({}, { message: "Max price must be numeric." })
  maxPrice?: string;

  @IsOptional()
  @IsString({ message: "Cursor must be a string." })
  cursor?: string;

  @IsOptional()
  @IsNumberString({}, { message: "Limit must be numeric." })
  limit?: string;
}
