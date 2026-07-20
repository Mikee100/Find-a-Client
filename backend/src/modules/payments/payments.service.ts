import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { MilestonesService } from "src/modules/milestones/milestones.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly milestonesService: MilestonesService
  ) {
    const stripeSecretKey = this.configService.get<string>("STRIPE_SECRET_KEY", "").trim();
    this.stripe = stripeSecretKey
      ? new Stripe(stripeSecretKey, {
          apiVersion: "2026-06-24.dahlia"
        })
      : null;
  }

  async handleStripeWebhook(rawBody: Buffer | undefined, signature?: string) {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.");
    }

    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET", "").trim();
    if (!webhookSecret) {
      throw new BadRequestException("Stripe webhook secret is not configured. Set STRIPE_WEBHOOK_SECRET.");
    }

    if (!rawBody || !signature) {
      throw new BadRequestException("Missing Stripe signature or request body.");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      throw new BadRequestException(`Invalid Stripe webhook signature: ${(error as Error).message}`);
    }

    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          payload: event.data.object as unknown as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        // Already processed this Stripe event id — replay-safe no-op.
        return { received: true, duplicate: true };
      }

      throw error;
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        await this.milestonesService.applyPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await this.milestonesService.applyPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await this.milestonesService.applyChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case "transfer.created":
        await this.milestonesService.applyTransferCreated(event.data.object as Stripe.Transfer);
        break;
      case "transfer.reversed":
        await this.milestonesService.applyTransferFailed(event.data.object as Stripe.Transfer);
        break;
      case "payout.paid":
      case "payout.failed":
        // Connect-account-scoped payout events reference a different id namespace
        // than what we persist on Payout (stripeTransferId). Logged above via the
        // StripeWebhookEvent insert for observability; no state mutation in v1.
        break;
      default:
        break;
    }

    await this.prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { processedAt: new Date() }
    });

    return { received: true };
  }
}
