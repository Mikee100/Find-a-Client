import { IsArray, IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength } from "class-validator";

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
  @IsEmail({}, { message: "Contact email is invalid." })
  contactEmail?: string;

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
