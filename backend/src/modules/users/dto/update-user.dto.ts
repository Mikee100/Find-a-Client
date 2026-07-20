import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUrl, Length, Matches, MaxLength } from "class-validator";
import { AVAILABILITY_STATUS, AvailabilityStatus, EXPERIENCE_LEVEL, ExperienceLevel } from "src/common/constants/domain-enums.constant";

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: "Full name must be a string." })
  fullName?: string;

  @IsOptional()
  @IsString({ message: "Title must be a string." })
  @Length(2, 120, { message: "Title must be between 2 and 120 characters." })
  title?: string;

  @IsOptional()
  @IsString({ message: "Bio must be a string." })
  @MaxLength(500, { message: "Bio cannot exceed 500 characters." })
  bio?: string;

  @IsOptional()
  @IsArray({ message: "Skills must be an array." })
  @IsString({ each: true, message: "Each skill must be a string." })
  skills?: string[];

  @IsOptional()
  @IsString({ message: "Primary stack must be a string." })
  @Length(2, 80, { message: "Primary stack must be between 2 and 80 characters." })
  primaryStack?: string;

  @IsOptional()
  @IsIn(Object.values(EXPERIENCE_LEVEL), { message: "Experience level is invalid." })
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsIn(Object.values(AVAILABILITY_STATUS), { message: "Availability status is invalid." })
  availabilityStatus?: AvailabilityStatus;

  @IsOptional()
  @IsString({ message: "Location must be a string." })
  location?: string;

  @IsOptional()
  @IsEmail({}, { message: "Contact email is invalid." })
  contactEmail?: string;

  @IsOptional()
  @IsBoolean({ message: "Public email enabled must be a boolean." })
  publicEmailEnabled?: boolean;

  @IsOptional()
  @IsArray({ message: "Education entries must be an array." })
  @IsString({ each: true, message: "Each education entry must be a string." })
  educationEntries?: string[];

  @IsOptional()
  @IsArray({ message: "Certification entries must be an array." })
  @IsString({ each: true, message: "Each certification entry must be a string." })
  certificationEntries?: string[];

  @IsOptional()
  @IsArray({ message: "Language entries must be an array." })
  @IsString({ each: true, message: "Each language entry must be a string." })
  languageEntries?: string[];

  @IsOptional()
  @Matches(/^\+?[0-9()\-\s]{7,20}$/, {
    message: "Phone number is invalid. Use digits and optional +, spaces, (), -."
  })
  phoneNumber?: string;

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
