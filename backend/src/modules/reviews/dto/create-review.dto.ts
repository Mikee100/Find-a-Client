import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReviewDto {
  @IsInt({ message: "Rating must be an integer." })
  @Min(1, { message: "Rating must be at least 1." })
  @Max(5, { message: "Rating cannot exceed 5." })
  rating!: number;

  @IsOptional()
  @IsString({ message: "Comment must be a string." })
  @MaxLength(1000, { message: "Comment cannot exceed 1000 chars." })
  comment?: string;
}
