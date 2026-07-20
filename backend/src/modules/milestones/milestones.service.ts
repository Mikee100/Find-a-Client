import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  DisputeRaisedBy,
  DisputeStatus,
  HireRequestStatus,
  MilestoneStatus,
  PaymentStatus,
  Prisma,
  PayoutStatus
} from "@prisma/client";
import Stripe from "stripe";
import { CacheService } from "src/common/cache/cache.service";
import { NOTIFICATION_TYPE } from "src/common/constants/domain-enums.constant";
import { calculatePlatformFee } from "src/common/constants/payments.constant";
import { USER_ROLE } from "src/common/constants/user-role.constant";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateMilestoneDto } from "src/modules/milestones/dto/create-milestone.dto";
import { CreateDisputeDto } from "src/modules/milestones/dto/create-dispute.dto";
import { FundMilestoneDto } from "src/modules/milestones/dto/fund-milestone.dto";
import { ReleaseMilestoneDto } from "src/modules/milestones/dto/release-milestone.dto";
import { ResolveDisputeDto } from "src/modules/milestones/dto/resolve-dispute.dto";
import { SubmitMilestoneDto } from "src/modules/milestones/dto/submit-milestone.dto";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { PrismaService } from "src/prisma/prisma.service";

const HIRE_REQUEST_ELIGIBLE_STATUSES: HireRequestStatus[] = ["ACCEPTED", "PROPOSAL_SENT", "NEGOTIATING"];

@Injectable()
export class MilestonesService {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService
  ) {
    const stripeSecretKey = this.configService.get<string>("STRIPE_SECRET_KEY", "").trim();
    this.stripe = stripeSecretKey
      ? new Stripe(stripeSecretKey, {
          apiVersion: "2026-06-24.dahlia"
        })
      : null;
  }

  private getStripeClient(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.");
    }

    return this.stripe;
  }

  private toStripeAmount(value: number): number {
    const amount = Math.round(value * 100);
    if (!Number.isFinite(amount) || amount < 1) {
      throw new BadRequestException("Amount must be at least 0.01");
    }

    return amount;
  }

  private async invalidateMilestoneCaches(clientId: string, developerId: string) {
    await Promise.all([
      this.cacheService.invalidateNamespace(`hire-requests-user:${clientId}`),
      this.cacheService.invalidateNamespace(`hire-requests-user:${developerId}`),
      this.cacheService.invalidateNamespace(`hire-request-by-id-user:${clientId}`),
      this.cacheService.invalidateNamespace(`hire-request-by-id-user:${developerId}`),
      this.cacheService.invalidateNamespace("hire-requests-admin"),
      this.cacheService.invalidateNamespace("hire-request-by-id-admin"),
      this.cacheService.invalidateNamespace(`developer-dashboard:${clientId}`),
      this.cacheService.invalidateNamespace(`developer-dashboard:${developerId}`),
      this.cacheService.invalidateNamespace(`milestone-by-id-user:${clientId}`),
      this.cacheService.invalidateNamespace(`milestone-by-id-user:${developerId}`),
      this.cacheService.invalidateNamespace("milestone-by-id-admin"),
      this.cacheService.invalidateNamespace(`milestones-hire-request-user:${clientId}`),
      this.cacheService.invalidateNamespace(`milestones-hire-request-user:${developerId}`),
      this.cacheService.invalidateNamespace("milestones-hire-request-admin")
    ]);
  }

  private async recordEvent(
    milestoneId: string,
    eventType: string,
    actorUserId: string | null,
    payload?: Record<string, unknown>
  ) {
    try {
      await this.prisma.milestoneEvent.create({
        data: {
          milestoneId,
          eventType,
          actorUserId,
          payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined
        }
      });
    } catch {
      // Do not fail the calling flow if audit logging fails.
    }
  }

  private requireIdempotencyKey(value?: string): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException("x-idempotency-key header is required");
    }

    return trimmed;
  }

  private async getMilestoneOrThrow(milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        hireRequest: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        payouts: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!milestone) {
      throw new NotFoundException("Milestone not found");
    }

    return milestone;
  }

  private ensureActorAccess(
    userId: string,
    role: string,
    clientId: string,
    developerId: string
  ): { isAdmin: boolean; isClient: boolean; isDeveloper: boolean } {
    const isAdmin = role === USER_ROLE.ADMIN;
    const isClient = clientId === userId;
    const isDeveloper = developerId === userId;

    if (!isAdmin && !isClient && !isDeveloper) {
      throw new ForbiddenException("You do not have access to this milestone");
    }

    return { isAdmin, isClient, isDeveloper };
  }

  async createForHireRequest(userId: string, role: string, hireRequestId: string, dto: CreateMilestoneDto) {
    if (role !== USER_ROLE.CLIENT && role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException("Only clients can create milestones");
    }

    const hireRequest = await this.prisma.hireRequest.findUnique({ where: { id: hireRequestId } });
    if (!hireRequest) {
      throw new NotFoundException("Hire request not found");
    }

    const isAdmin = role === USER_ROLE.ADMIN;
    if (!isAdmin && hireRequest.clientId !== userId) {
      throw new ForbiddenException("Only the owning client can create milestones for this hire request");
    }

    if (!HIRE_REQUEST_ELIGIBLE_STATUSES.includes(hireRequest.status)) {
      throw new BadRequestException("Hire request is not in a milestone-eligible status");
    }

    const existing = await this.prisma.milestone.findUnique({ where: { hireRequestId } });
    if (existing) {
      throw new BadRequestException("A milestone already exists for this hire request");
    }

    const currency = (dto.currency ?? hireRequest.proposalCurrency ?? hireRequest.budgetCurrency ?? "USD").toUpperCase();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const milestone = await this.prisma.milestone.create({
      data: {
        hireRequestId,
        title: sanitizeInput(dto.title),
        amount: dto.amount,
        currency,
        dueDate
      }
    });

    await this.invalidateMilestoneCaches(hireRequest.clientId, hireRequest.developerId);
    await this.recordEvent(milestone.id, "MILESTONE_CREATED", userId, {
      amount: milestone.amount,
      currency: milestone.currency
    });

    try {
      await this.notificationsService.dispatch(hireRequest.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId,
        milestoneId: milestone.id,
        status: milestone.status,
        amount: milestone.amount,
        currency: milestone.currency
      });
    } catch {
      // Do not fail milestone creation on notification issues.
    }

    return milestone;
  }

  async fund(
    userId: string,
    role: string,
    milestoneId: string,
    _dto: FundMilestoneDto,
    idempotencyKeyHeader?: string
  ) {
    const idempotencyKey = this.requireIdempotencyKey(idempotencyKeyHeader);
    const milestone = await this.getMilestoneOrThrow(milestoneId);
    const { hireRequest } = milestone;

    const { isAdmin, isClient } = this.ensureActorAccess(userId, role, hireRequest.clientId, hireRequest.developerId);
    if (!isAdmin && !isClient) {
      throw new ForbiddenException("Only the owning client can fund this milestone");
    }

    if (milestone.status !== "PENDING") {
      throw new BadRequestException("Milestone is not in a fundable state");
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        milestoneId,
        idempotencyKey
      },
      orderBy: { createdAt: "desc" }
    });

    if (existingPayment) {
      return {
        milestoneId,
        status: milestone.status,
        payment: existingPayment
      };
    }

    const stripe = this.getStripeClient();
    const feeAmount = calculatePlatformFee(Number(milestone.amount));
    const amount = Number(milestone.amount);
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: this.toStripeAmount(amount),
        currency: milestone.currency.toLowerCase(),
        payment_method: _dto.paymentMethodId,
        confirm: Boolean(_dto.paymentMethodId),
        automatic_payment_methods: _dto.paymentMethodId ? undefined : { enabled: true },
        metadata: {
          milestoneId,
          hireRequestId: hireRequest.id,
          clientId: hireRequest.clientId,
          developerId: hireRequest.developerId
        },
        description: `Milestone funding for ${milestone.title}`
      },
      {
        idempotencyKey
      }
    );

    const resolvedStatus = paymentIntent.status === "succeeded" ? "SUCCEEDED" : "PROCESSING";

    const stripePaymentIntentId = paymentIntent.id;

    const payment = await this.prisma.payment.create({
      data: {
        milestoneId,
        stripePaymentIntentId,
        amount,
        feeAmount,
        currency: milestone.currency,
        status: resolvedStatus,
        idempotencyKey,
        providerPayload: {
          provider: "stripe",
          idempotencyKey,
          paymentIntentStatus: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
          returnUrl: _dto.returnUrl ?? null
        }
      }
    });

    const milestoneData =
      resolvedStatus === "SUCCEEDED"
        ? {
            status: "FUNDED" as MilestoneStatus,
            fundedAt: new Date()
          }
        : {
            status: "PENDING" as MilestoneStatus
          };

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: milestoneData
    });

    await this.invalidateMilestoneCaches(hireRequest.clientId, hireRequest.developerId);
    await this.recordEvent(milestoneId, "PAYMENT_INTENT_CREATED", userId, {
      stripePaymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      resolvedStatus
    });

    try {
      await this.notificationsService.dispatch(hireRequest.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId: hireRequest.id,
        milestoneId,
        status: updatedMilestone.status,
        amount: updatedMilestone.amount,
        currency: updatedMilestone.currency
      });
    } catch {
      // Do not fail funding flow on notification issues.
    }

    return {
      milestoneId,
      status: updatedMilestone.status,
      payment,
      fundedAt: updatedMilestone.fundedAt,
      paymentIntentClientSecret: paymentIntent.client_secret
    };
  }

  async submit(userId: string, role: string, milestoneId: string, dto: SubmitMilestoneDto) {
    const milestone = await this.getMilestoneOrThrow(milestoneId);
    const { hireRequest } = milestone;

    const { isAdmin, isDeveloper } = this.ensureActorAccess(
      userId,
      role,
      hireRequest.clientId,
      hireRequest.developerId
    );

    if (!isAdmin && !isDeveloper) {
      throw new ForbiddenException("Only the assigned developer can submit this milestone");
    }

    if (milestone.status !== "FUNDED" && milestone.status !== "IN_PROGRESS") {
      throw new BadRequestException("Milestone is not in a submittable state");
    }

    const providerPayload = {
      deliveryNote: dto.deliveryNote ? sanitizeInput(dto.deliveryNote) : null,
      artifacts: dto.artifacts ?? []
    };

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: "SUBMITTED" as MilestoneStatus,
        submittedAt: new Date()
      }
    });

    await this.prisma.payment.updateMany({
      where: { milestoneId },
      data: {
        providerPayload
      }
    });

    await this.invalidateMilestoneCaches(hireRequest.clientId, hireRequest.developerId);
    await this.recordEvent(milestoneId, "MILESTONE_SUBMITTED", userId, providerPayload);

    try {
      await this.notificationsService.dispatch(hireRequest.clientId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId: hireRequest.id,
        milestoneId,
        status: updatedMilestone.status
      });
    } catch {
      // Do not fail submit flow on notification issues.
    }

    return {
      milestoneId,
      status: updatedMilestone.status,
      submittedAt: updatedMilestone.submittedAt
    };
  }

  /**
   * Creates the Stripe transfer + Payout record and marks a milestone RELEASED.
   * Shared by the client-initiated release() flow and admin dispute resolution
   * (RESOLVED_RELEASE), since both end in the same payout mechanics.
   */
  private async createPayoutTransfer(params: {
    milestoneId: string;
    hireRequest: { id: string; clientId: string; developerId: string };
    amount: number;
    currency: string;
    title: string;
    idempotencyKey: string;
    note?: string;
  }) {
    const { milestoneId, hireRequest, amount, currency, title, idempotencyKey, note } = params;

    const existingPayout = await this.prisma.payout.findFirst({
      where: { milestoneId },
      orderBy: { createdAt: "desc" }
    });

    if (existingPayout && existingPayout.providerPayload && typeof existingPayout.providerPayload === "object") {
      const payload = existingPayout.providerPayload as Record<string, unknown>;
      if (payload.idempotencyKey === idempotencyKey) {
        return {
          status: "RELEASED" as MilestoneStatus,
          releasedAt: null as Date | null,
          payout: existingPayout
        };
      }
    }

    const stripe = this.getStripeClient();
    const feeAmount = calculatePlatformFee(amount);
    const netAmount = Number((amount - feeAmount).toFixed(2));

    const developer = await this.prisma.user.findUnique({
      where: { id: hireRequest.developerId },
      select: {
        id: true,
        stripeAccountId: true,
        stripePayoutsEnabled: true
      }
    });

    if (!developer?.stripeAccountId) {
      throw new BadRequestException("Developer payout account is not connected");
    }

    const transfer = await stripe.transfers.create(
      {
        amount: this.toStripeAmount(netAmount),
        currency: currency.toLowerCase(),
        destination: developer.stripeAccountId,
        metadata: {
          milestoneId,
          hireRequestId: hireRequest.id,
          developerId: hireRequest.developerId
        },
        description: `Milestone payout for ${title}`
      },
      {
        idempotencyKey
      }
    );

    const [updatedMilestone, payout] = await this.prisma.$transaction([
      this.prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          status: "RELEASED" as MilestoneStatus,
          releasedAt: new Date()
        }
      }),
      this.prisma.payout.create({
        data: {
          milestoneId,
          developerId: hireRequest.developerId,
          amount: netAmount,
          currency,
          stripeTransferId: transfer.id,
          status: "IN_TRANSIT" as PayoutStatus,
          providerPayload: {
            provider: "stripe",
            idempotencyKey,
            note: note ? sanitizeInput(note) : null,
            transferCreatedAt: transfer.created
          }
        }
      })
    ]);

    await this.invalidateMilestoneCaches(hireRequest.clientId, hireRequest.developerId);
    await this.recordEvent(milestoneId, "TRANSFER_CREATED", null, {
      stripeTransferId: transfer.id,
      netAmount,
      feeAmount
    });

    return {
      status: updatedMilestone.status,
      releasedAt: updatedMilestone.releasedAt,
      payout
    };
  }

  async release(
    userId: string,
    role: string,
    milestoneId: string,
    dto: ReleaseMilestoneDto,
    idempotencyKeyHeader?: string
  ) {
    const idempotencyKey = this.requireIdempotencyKey(idempotencyKeyHeader);
    const milestone = await this.getMilestoneOrThrow(milestoneId);
    const { hireRequest } = milestone;

    const { isAdmin, isClient } = this.ensureActorAccess(userId, role, hireRequest.clientId, hireRequest.developerId);
    if (!isAdmin && !isClient) {
      throw new ForbiddenException("Only the owning client can release this milestone");
    }

    if (milestone.status !== "SUBMITTED") {
      throw new BadRequestException("Milestone is not in a releasable state");
    }

    const result = await this.createPayoutTransfer({
      milestoneId,
      hireRequest,
      amount: Number(milestone.amount),
      currency: milestone.currency,
      title: milestone.title,
      idempotencyKey,
      note: dto.note
    });

    try {
      await this.notificationsService.dispatch(hireRequest.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId: hireRequest.id,
        milestoneId,
        status: result.status,
        payoutId: result.payout.id
      });
    } catch {
      // Do not fail release flow on notification issues.
    }

    return {
      milestoneId,
      status: result.status,
      releasedAt: result.releasedAt,
      payout: result.payout,
      reviewUnlocked: true
    };
  }

  async dispute(userId: string, role: string, milestoneId: string, dto: CreateDisputeDto) {
    const milestone = await this.getMilestoneOrThrow(milestoneId);
    const { hireRequest } = milestone;

    const { isAdmin, isClient, isDeveloper } = this.ensureActorAccess(
      userId,
      role,
      hireRequest.clientId,
      hireRequest.developerId
    );

    if (!isAdmin && !isClient && !isDeveloper) {
      throw new ForbiddenException("Only participants can dispute this milestone");
    }

    if (milestone.status === "RELEASED" || milestone.status === "REFUNDED") {
      throw new BadRequestException("Cannot dispute a closed milestone");
    }

    const raisedBy: DisputeRaisedBy = isDeveloper
      ? "DEVELOPER"
      : isClient
        ? "CLIENT"
        : "SYSTEM";

    const dispute = await this.prisma.dispute.create({
      data: {
        milestoneId,
        raisedBy,
        raisedByUserId: userId,
        reason: sanitizeInput(dto.reason),
        status: "OPEN" as DisputeStatus
      }
    });

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: "DISPUTED" as MilestoneStatus
      }
    });

    await this.invalidateMilestoneCaches(hireRequest.clientId, hireRequest.developerId);
    await this.recordEvent(milestoneId, "DISPUTE_RAISED", userId, {
      disputeId: dispute.id,
      raisedBy
    });

    const recipientId = isClient ? hireRequest.developerId : hireRequest.clientId;

    try {
      await this.notificationsService.dispatch(recipientId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId: hireRequest.id,
        milestoneId,
        status: updatedMilestone.status,
        disputeId: dispute.id
      });
    } catch {
      // Do not fail dispute flow on notification issues.
    }

    return {
      id: dispute.id,
      milestoneId,
      raisedBy,
      status: dispute.status,
      createdAt: dispute.createdAt
    };
  }

  async getPayoutAccountStatus(userId: string, role: string, developerId: string) {
    const stripe = this.getStripeClient();
    const isAdmin = role === USER_ROLE.ADMIN;
    if (!isAdmin && userId !== developerId) {
      throw new ForbiddenException("You can only access your own payout account status");
    }

    const developer = await this.prisma.user.findUnique({
      where: { id: developerId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true
      }
    });

    if (!developer || developer.role !== USER_ROLE.DEVELOPER) {
      throw new NotFoundException("Developer not found");
    }

    let accountId = developer.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: developer.email,
        business_type: "individual",
        metadata: {
          developerId: developer.id,
          fullName: developer.fullName
        }
      });
      accountId = account.id;

      await this.prisma.user.update({
        where: { id: developer.id },
        data: {
          stripeAccountId: account.id
        }
      });
    }

    const account = await stripe.accounts.retrieve(accountId);

    const refreshUrl = this.configService.get<string>(
      "STRIPE_CONNECT_REFRESH_URL",
      `${this.configService.get<string>("FRONTEND_URL", "http://localhost:3060")}/developer/settings`
    );
    const returnUrl = this.configService.get<string>(
      "STRIPE_CONNECT_RETURN_URL",
      `${this.configService.get<string>("FRONTEND_URL", "http://localhost:3060")}/developer/settings`
    );

    let onboardingUrl: string | null = null;
    if (!account.details_submitted) {
      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding"
      });

      onboardingUrl = link.url;
    }

    await this.prisma.user.update({
      where: { id: developer.id },
      data: {
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted
      }
    });

    return {
      developerId: developer.id,
      provider: "stripe_connect",
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingRequired: !account.details_submitted,
      onboardingUrl
    };
  }

  async getById(userId: string, role: string, milestoneId: string) {
    const cacheNamespace = role === USER_ROLE.ADMIN ? "milestone-by-id-admin" : `milestone-by-id-user:${userId}`;
    const cacheKey = await this.cacheService.composeKey(cacheNamespace, milestoneId);
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const milestone = await this.getMilestoneOrThrow(milestoneId);
    this.ensureActorAccess(userId, role, milestone.hireRequest.clientId, milestone.hireRequest.developerId);

    await this.cacheService.set(cacheKey, milestone, 15);
    return milestone;
  }

  async listForHireRequest(userId: string, role: string, hireRequestId: string) {
    const cacheNamespace =
      role === USER_ROLE.ADMIN ? "milestones-hire-request-admin" : `milestones-hire-request-user:${userId}`;
    const cacheKey = await this.cacheService.composeKey(cacheNamespace, hireRequestId);
    const cached = await this.cacheService.get<Array<Record<string, unknown>>>(cacheKey);
    if (cached) {
      return cached;
    }

    const hireRequest = await this.prisma.hireRequest.findUnique({ where: { id: hireRequestId } });
    if (!hireRequest) {
      throw new NotFoundException("Hire request not found");
    }

    this.ensureActorAccess(userId, role, hireRequest.clientId, hireRequest.developerId);

    const milestones = await this.prisma.milestone.findMany({
      where: { hireRequestId },
      include: {
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        payouts: { orderBy: { createdAt: "desc" }, take: 1 },
        disputes: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" }
    });

    await this.cacheService.set(cacheKey, milestones, 15);
    return milestones;
  }

  async listEvents(userId: string, role: string, milestoneId: string) {
    const milestone = await this.getMilestoneOrThrow(milestoneId);
    this.ensureActorAccess(userId, role, milestone.hireRequest.clientId, milestone.hireRequest.developerId);

    return this.prisma.milestoneEvent.findMany({
      where: { milestoneId },
      orderBy: { createdAt: "desc" }
    });
  }

  async resolveDispute(
    adminUserId: string,
    disputeId: string,
    dto: ResolveDisputeDto,
    idempotencyKeyHeader?: string
  ) {
    const idempotencyKey = this.requireIdempotencyKey(idempotencyKeyHeader);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        milestone: {
          include: { hireRequest: true }
        }
      }
    });

    if (!dispute) {
      throw new NotFoundException("Dispute not found");
    }

    if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
      throw new BadRequestException("Dispute is already resolved");
    }

    const { milestone } = dispute;
    if (milestone.status !== "DISPUTED") {
      throw new BadRequestException("Milestone is not in a disputed state");
    }

    const { hireRequest } = milestone;

    if (dto.resolution === "RESOLVED_RELEASE") {
      const result = await this.createPayoutTransfer({
        milestoneId: milestone.id,
        hireRequest,
        amount: Number(milestone.amount),
        currency: milestone.currency,
        title: milestone.title,
        idempotencyKey,
        note: dto.note
      });

      const updatedDispute = await this.prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: "RESOLVED_RELEASE" as DisputeStatus,
          resolution: dto.note ? sanitizeInput(dto.note) : null,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date()
        }
      });

      await this.recordEvent(milestone.id, "DISPUTE_RESOLVED", adminUserId, {
        disputeId,
        resolution: "RESOLVED_RELEASE"
      });

      try {
        await Promise.all([
          this.notificationsService.dispatch(hireRequest.clientId, NOTIFICATION_TYPE.DEAL_INTEREST, {
            hireRequestId: hireRequest.id,
            milestoneId: milestone.id,
            status: result.status,
            disputeId
          }),
          this.notificationsService.dispatch(hireRequest.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
            hireRequestId: hireRequest.id,
            milestoneId: milestone.id,
            status: result.status,
            disputeId
          })
        ]);
      } catch {
        // Do not fail resolution flow on notification issues.
      }

      return {
        disputeId,
        status: updatedDispute.status,
        milestoneId: milestone.id,
        milestoneStatus: result.status,
        payout: result.payout
      };
    }

    const stripe = this.getStripeClient();
    const latestPayment = await this.prisma.payment.findFirst({
      where: { milestoneId: milestone.id, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" }
    });

    if (!latestPayment) {
      throw new BadRequestException("No successful payment found to refund for this milestone");
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: latestPayment.stripePaymentIntentId
      },
      {
        idempotencyKey
      }
    );

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: "REFUNDED" as MilestoneStatus
      }
    });

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED_REFUND" as DisputeStatus,
        resolution: dto.note ? sanitizeInput(dto.note) : null,
        resolvedByUserId: adminUserId,
        resolvedAt: new Date()
      }
    });

    await this.invalidateMilestoneCaches(hireRequest.clientId, hireRequest.developerId);
    await this.recordEvent(milestone.id, "DISPUTE_RESOLVED", adminUserId, {
      disputeId,
      resolution: "RESOLVED_REFUND",
      stripeRefundId: refund.id
    });

    try {
      await Promise.all([
        this.notificationsService.dispatch(hireRequest.clientId, NOTIFICATION_TYPE.DEAL_INTEREST, {
          hireRequestId: hireRequest.id,
          milestoneId: milestone.id,
          status: updatedMilestone.status,
          disputeId
        }),
        this.notificationsService.dispatch(hireRequest.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
          hireRequestId: hireRequest.id,
          milestoneId: milestone.id,
          status: updatedMilestone.status,
          disputeId
        })
      ]);
    } catch {
      // Do not fail resolution flow on notification issues.
    }

    return {
      disputeId,
      status: updatedDispute.status,
      milestoneId: milestone.id,
      milestoneStatus: updatedMilestone.status
    };
  }

  async applyPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { milestone: { include: { hireRequest: true } } }
    });

    if (!payment) {
      return;
    }

    if (payment.status !== "SUCCEEDED") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED" as PaymentStatus }
      });
    }

    const { milestone } = payment;
    if (milestone.status === "PENDING") {
      await this.prisma.milestone.update({
        where: { id: milestone.id },
        data: {
          status: "FUNDED" as MilestoneStatus,
          fundedAt: new Date()
        }
      });

      await this.invalidateMilestoneCaches(milestone.hireRequest.clientId, milestone.hireRequest.developerId);

      try {
        await this.notificationsService.dispatch(milestone.hireRequest.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
          hireRequestId: milestone.hireRequest.id,
          milestoneId: milestone.id,
          status: "FUNDED"
        });
      } catch {
        // Do not fail webhook processing on notification issues.
      }
    }

    await this.recordEvent(milestone.id, "PAYMENT_INTENT_SUCCEEDED", null, {
      stripePaymentIntentId: paymentIntent.id
    });
  }

  async applyPaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { milestone: { include: { hireRequest: true } } }
    });

    if (!payment) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" as PaymentStatus }
    });

    await this.recordEvent(payment.milestoneId, "PAYMENT_INTENT_FAILED", null, {
      stripePaymentIntentId: paymentIntent.id
    });

    try {
      await this.notificationsService.dispatch(payment.milestone.hireRequest.clientId, NOTIFICATION_TYPE.DEAL_INTEREST, {
        hireRequestId: payment.milestone.hireRequest.id,
        milestoneId: payment.milestoneId,
        status: "PAYMENT_FAILED"
      });
    } catch {
      // Do not fail webhook processing on notification issues.
    }
  }

  async applyChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) {
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { milestone: true }
    });

    if (!payment || payment.milestone.status !== "DISPUTED") {
      // Refunds should only land here as a result of admin dispute resolution.
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" as PaymentStatus }
    });

    await this.recordEvent(payment.milestoneId, "CHARGE_REFUNDED", null, {
      stripeChargeId: charge.id
    });
  }

  /**
   * Reconciliation backstop: createPayoutTransfer() calls Stripe then writes
   * milestone+payout in one DB transaction. If the process dies after Stripe
   * confirms the transfer but before that transaction commits, this event is
   * the only record the transfer ever happened, so it must be able to
   * backfill the missing milestone/payout state, not just confirm it.
   */
  async applyTransferCreated(transfer: Stripe.Transfer) {
    const existingPayout = await this.prisma.payout.findUnique({
      where: { stripeTransferId: transfer.id }
    });

    if (existingPayout) {
      await this.recordEvent(existingPayout.milestoneId, "TRANSFER_CONFIRMED", null, {
        stripeTransferId: transfer.id
      });
      return;
    }

    const milestoneId = typeof transfer.metadata?.milestoneId === "string" ? transfer.metadata.milestoneId : null;
    if (!milestoneId) {
      return;
    }

    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { hireRequest: true }
    });

    if (!milestone || milestone.status === "RELEASED" || milestone.status === "REFUNDED") {
      return;
    }

    const netAmount = transfer.amount / 100;

    await this.prisma.$transaction([
      this.prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          status: "RELEASED" as MilestoneStatus,
          releasedAt: new Date()
        }
      }),
      this.prisma.payout.create({
        data: {
          milestoneId,
          developerId: milestone.hireRequest.developerId,
          amount: netAmount,
          currency: transfer.currency.toUpperCase(),
          stripeTransferId: transfer.id,
          status: "IN_TRANSIT" as PayoutStatus,
          providerPayload: {
            provider: "stripe",
            backfilledFromWebhook: true,
            transferCreatedAt: transfer.created
          }
        }
      })
    ]);

    await this.invalidateMilestoneCaches(milestone.hireRequest.clientId, milestone.hireRequest.developerId);
    await this.recordEvent(milestoneId, "TRANSFER_CONFIRMED", null, {
      stripeTransferId: transfer.id,
      backfilled: true
    });
  }

  async applyTransferFailed(transfer: Stripe.Transfer) {
    const payout = await this.prisma.payout.findUnique({
      where: { stripeTransferId: transfer.id },
      include: { milestone: { include: { hireRequest: true } } }
    });

    if (!payout) {
      return;
    }

    await this.prisma.payout.update({
      where: { id: payout.id },
      data: { status: "FAILED" as PayoutStatus }
    });

    if (payout.milestone.status === "RELEASED") {
      await this.prisma.milestone.update({
        where: { id: payout.milestoneId },
        data: { status: "SUBMITTED" as MilestoneStatus }
      });

      await this.invalidateMilestoneCaches(
        payout.milestone.hireRequest.clientId,
        payout.milestone.hireRequest.developerId
      );
    }

    await this.recordEvent(payout.milestoneId, "TRANSFER_FAILED", null, {
      stripeTransferId: transfer.id
    });

    try {
      await Promise.all([
        this.notificationsService.dispatch(payout.milestone.hireRequest.clientId, NOTIFICATION_TYPE.DEAL_INTEREST, {
          hireRequestId: payout.milestone.hireRequest.id,
          milestoneId: payout.milestoneId,
          status: "PAYOUT_FAILED"
        }),
        this.notificationsService.dispatch(payout.developerId, NOTIFICATION_TYPE.DEAL_INTEREST, {
          hireRequestId: payout.milestone.hireRequest.id,
          milestoneId: payout.milestoneId,
          status: "PAYOUT_FAILED"
        })
      ]);
    } catch {
      // Do not fail webhook processing on notification issues.
    }
  }
}
