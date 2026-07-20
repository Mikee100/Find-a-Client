import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ResolveDisputeDto {
  @IsIn(["RESOLVED_RELEASE", "RESOLVED_REFUND"], {
    message: "Resolution must be RESOLVED_RELEASE or RESOLVED_REFUND."
  })
  resolution!: "RESOLVED_RELEASE" | "RESOLVED_REFUND";

  @IsOptional()
  @IsString({ message: "Note must be a string." })
  @MaxLength(2000, { message: "Note cannot exceed 2000 characters." })
  note?: string;
}
