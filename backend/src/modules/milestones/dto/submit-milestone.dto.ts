import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export class SubmitMilestoneDto {
  @IsOptional()
  @IsString({ message: "Delivery note must be a string." })
  @MaxLength(5000, { message: "Delivery note cannot exceed 5000 characters." })
  deliveryNote?: string;

  @IsOptional()
  @IsArray({ message: "Artifacts must be an array of links." })
  @IsString({ each: true, message: "Each artifact must be a string URL." })
  artifacts?: string[];
}
