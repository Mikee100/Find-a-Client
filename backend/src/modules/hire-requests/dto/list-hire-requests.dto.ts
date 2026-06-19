import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

const HIRE_REQUEST_SCOPE = ["all", "sent", "received"] as const;
const HIRE_REQUEST_STATUS = ["PENDING", "REVIEWING", "PROPOSAL_SENT", "NEGOTIATING", "ACCEPTED", "REJECTED", "CANCELLED"] as const;

export class ListHireRequestsDto {
  @IsOptional()
  @IsIn(HIRE_REQUEST_SCOPE, { message: "Scope is invalid." })
  scope?: (typeof HIRE_REQUEST_SCOPE)[number];

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  @IsIn(HIRE_REQUEST_STATUS, { message: "Status is invalid." })
  status?: (typeof HIRE_REQUEST_STATUS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limit must be an integer." })
  @Min(1, { message: "Limit must be at least 1." })
  @Max(100, { message: "Limit cannot exceed 100." })
  limit?: number;
}
