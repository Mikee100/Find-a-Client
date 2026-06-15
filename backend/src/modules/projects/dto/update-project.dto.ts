import {
	IsArray,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	IsUrl,
	Length,
	MaxLength
} from "class-validator";
import { PricingType, ProjectCategory, ProjectStatus } from "@prisma/client";

export class UpdateProjectDto {
	@IsOptional()
	@IsString({ message: "Title must be a string." })
	@Length(3, 120, { message: "Title must be between 3 and 120 characters." })
	title?: string;

	@IsOptional()
	@IsString({ message: "Short description must be a string." })
	@MaxLength(160, { message: "Short description cannot exceed 160 characters." })
	shortDescription?: string;

	@IsOptional()
	@IsString({ message: "Long description must be a string." })
	longDescription?: string;

	@IsOptional()
	@IsEnum(ProjectCategory, { message: "Category is invalid." })
	category?: ProjectCategory;

	@IsOptional()
	@IsEnum(ProjectStatus, { message: "Status is invalid." })
	status?: ProjectStatus;

	@IsOptional()
	@IsArray({ message: "Tech stack must be an array." })
	@IsString({ each: true, message: "Each tech stack value must be a string." })
	techStack?: string[];

	@IsOptional()
	@IsArray({ message: "Industries must be an array." })
	@IsString({ each: true, message: "Each industry must be a string." })
	industries?: string[];

	@IsOptional()
	@IsEnum(PricingType, { message: "Pricing type is invalid." })
	pricingType?: PricingType;

	@IsOptional()
	@IsNumber({}, { message: "Price must be a number." })
	price?: number;

	@IsOptional()
	@IsUrl({}, { message: "Demo URL is invalid." })
	demoUrl?: string;
}
