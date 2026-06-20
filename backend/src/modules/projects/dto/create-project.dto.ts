import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
  MaxLength
} from "class-validator";
import { PRICING_TYPE, PROJECT_CATEGORY, PricingType, ProjectCategory } from "src/common/constants/domain-enums.constant";

export class CreateProjectDto {
  @IsString({ message: "Title must be a string." })
  @Length(3, 120, { message: "Title must be between 3 and 120 characters." })
  title!: string;

  @IsString({ message: "Short description must be a string." })
  @MaxLength(160, { message: "Short description cannot exceed 160 characters." })
  shortDescription!: string;

  @IsString({ message: "Long description must be a string." })
  @Length(30, 5000, { message: "Long description must be between 30 and 5000 characters." })
  longDescription!: string;

  @IsOptional()
  @IsString({ message: "Role in project must be a string." })
  @Length(2, 120, { message: "Role in project must be between 2 and 120 characters." })
  roleInProject?: string;

  @IsOptional()
  @IsUrl({}, { message: "Repository URL is invalid." })
  repositoryUrl?: string;

  @IsIn(Object.values(PROJECT_CATEGORY), { message: "Category is invalid." })
  category!: ProjectCategory;

  @IsArray({ message: "Tech stack must be an array." })
  @ArrayNotEmpty({ message: "Tech stack cannot be empty." })
  @IsString({ each: true, message: "Each tech stack value must be a string." })
  techStack!: string[];

  @IsArray({ message: "Industries must be an array." })
  @ArrayNotEmpty({ message: "Industries cannot be empty." })
  @IsString({ each: true, message: "Each industry must be a string." })
  industries!: string[];

  @IsIn(Object.values(PRICING_TYPE), { message: "Pricing type is invalid." })
  pricingType!: PricingType;

  @IsOptional()
  @IsNumber({}, { message: "Price must be a number." })
  @Min(0, { message: "Price must be 0 or more." })
  price?: number;

  @IsOptional()
  @IsString({ message: "Currency must be a string." })
  @Length(3, 3, { message: "Currency must be a 3-letter ISO code." })
  @IsIn(["USD", "EUR", "GBP", "CAD", "AUD", "NGN", "KES", "ZAR"], {
    message: "Currency is not supported."
  })
  currency?: string;

  @IsOptional()
  @IsUrl({}, { message: "Demo URL is invalid." })
  demoUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "Thumbnail URL is invalid." })
  thumbnailUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "Background image URL is invalid." })
  backgroundUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "Video URL is invalid." })
  videoUrl?: string;

  @IsOptional()
  @IsArray({ message: "Screenshots must be an array." })
  @IsUrl({}, { each: true, message: "Each screenshot URL must be valid." })
  screenshots?: string[];
}
