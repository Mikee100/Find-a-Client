import { Controller, Headers, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { Public } from "src/common/decorators/public.decorator";
import { PaymentsService } from "src/modules/payments/payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @Post("webhooks/stripe")
  handleStripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature?: string) {
    return this.paymentsService.handleStripeWebhook(req.rawBody, signature);
  }
}
