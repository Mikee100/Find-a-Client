import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

const MEDIA_UPLOAD_TYPE = ["IMAGE", "VIDEO", "SCREENSHOT", "THUMBNAIL"] as const;
type MediaUploadType = (typeof MEDIA_UPLOAD_TYPE)[number];

export class UploadMediaDto {
  @IsOptional()
  @IsUUID("4", { message: "Project id must be a valid UUID." })
  projectId?: string;

  @IsOptional()
  @IsIn(MEDIA_UPLOAD_TYPE, { message: "Media type is invalid." })
  mediaType?: MediaUploadType;

  @IsOptional()
  @IsString({ message: "Caption must be a string." })
  @MaxLength(120, { message: "Caption cannot exceed 120 characters." })
  caption?: string;
}
