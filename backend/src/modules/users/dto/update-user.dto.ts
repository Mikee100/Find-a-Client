import { IsArray, IsOptional, IsString, MaxLength, IsUrl } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: "Full name must be a string." })
  fullName?: string;

  @IsOptional()
  @IsString({ message: "Bio must be a string." })
  @MaxLength(500, { message: "Bio cannot exceed 500 characters." })
  bio?: string;

  @IsOptional()
  @IsArray({ message: "Skills must be an array." })
  @IsString({ each: true, message: "Each skill must be a string." })
  skills?: string[];

  @IsOptional()
  @IsString({ message: "Location must be a string." })
  location?: string;

  @IsOptional()
  @IsUrl({}, { message: "Website URL is invalid." })
  websiteUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "GitHub URL is invalid." })
  githubUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "LinkedIn URL is invalid." })
  linkedinUrl?: string;
}
