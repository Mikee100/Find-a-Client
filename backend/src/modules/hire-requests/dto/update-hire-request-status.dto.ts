import { Transform } from "class-transformer";
import { IsIn } from "class-validator";

const HIRE_REQUEST_STATUS = ["PENDING", "REVIEWING", "PROPOSAL_SENT", "NEGOTIATING", "ACCEPTED", "REJECTED", "CANCELLED"] as const;

export class UpdateHireRequestStatusDto {
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  @IsIn(HIRE_REQUEST_STATUS, { message: "Status is invalid." })
  status!: (typeof HIRE_REQUEST_STATUS)[number];
}
