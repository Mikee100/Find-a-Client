import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const INQUIRY_TYPE = ["ASK_QUESTION", "OFFER_PROJECT"] as const;

export class CreateProjectInquiryDto {
  @IsOptional()
  @IsIn(INQUIRY_TYPE, { message: "Inquiry type is invalid." })
  type?: (typeof INQUIRY_TYPE)[number];

  @IsOptional()
  @IsString({ message: "Message must be a string." })
  @MaxLength(1200, { message: "Message cannot exceed 1200 characters." })
  message?: string;
}
