import { IsOptional, IsString } from "class-validator";

export class UploadMediaDto {
  @IsOptional()
  @IsString({ message: "Project id must be a string." })
  projectId?: string;
}
