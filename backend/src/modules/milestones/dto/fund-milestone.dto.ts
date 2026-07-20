import { IsOptional, IsString, MaxLength } from "class-validator";

export class FundMilestoneDto {
  @IsOptional()
  @IsString({ message: "Payment method id must be a string." })
  @MaxLength(120, { message: "Payment method id is too long." })
  paymentMethodId?: string;

  @IsOptional()
  @IsString({ message: "Return URL must be a string." })
  @MaxLength(500, { message: "Return URL is too long." })
  returnUrl?: string;
}
