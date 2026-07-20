-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'FUNDED', 'IN_PROGRESS', 'SUBMITTED', 'RELEASED', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'CANCELED');

-- CreateEnum
CREATE TYPE "DisputeRaisedBy" AS ENUM ('CLIENT', 'DEVELOPER', 'SYSTEM');

-- CreateTable
CREATE TABLE "Milestone" (
    "id" UUID NOT NULL,
    "hireRequestId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "fundedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "stripePaymentIntentId" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'REQUIRES_CONFIRMATION',
    "idempotencyKey" VARCHAR(120),
    "providerPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "developerId" UUID NOT NULL,
    "stripeTransferId" VARCHAR(120),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "providerPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "raisedBy" "DisputeRaisedBy" NOT NULL,
    "raisedByUserId" UUID,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneEvent" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "eventType" VARCHAR(80) NOT NULL,
    "actorUserId" UUID,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" UUID NOT NULL,
    "stripeEventId" VARCHAR(120) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ux_milestone_hire_request_single_v1" ON "Milestone"("hireRequestId");

-- CreateIndex
CREATE INDEX "idx_milestone_status_created" ON "Milestone"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_milestone_hire_status" ON "Milestone"("hireRequestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "idx_payment_milestone_created" ON "Payment"("milestoneId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_payment_status_created" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_payment_idempotency" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripeTransferId_key" ON "Payout"("stripeTransferId");

-- CreateIndex
CREATE INDEX "idx_payout_developer_created" ON "Payout"("developerId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_payout_status_created" ON "Payout"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_payout_milestone" ON "Payout"("milestoneId");

-- CreateIndex
CREATE INDEX "idx_dispute_milestone_status" ON "Dispute"("milestoneId", "status");

-- CreateIndex
CREATE INDEX "idx_dispute_created" ON "Dispute"("createdAt");

-- CreateIndex
CREATE INDEX "idx_milestone_event_created" ON "MilestoneEvent"("milestoneId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "idx_stripe_webhook_event_type_created" ON "StripeWebhookEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_hireRequestId_fkey" FOREIGN KEY ("hireRequestId") REFERENCES "HireRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneEvent" ADD CONSTRAINT "MilestoneEvent_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Review: gate reviews to a single released milestone instead of one-per-(project, reviewer)
ALTER TABLE "Review" ADD COLUMN "milestoneId" UUID;

-- Backfill note: existing (pre-escrow) reviews have no milestone to attach to.
-- They are deleted here rather than left with a null milestoneId, since the
-- column is NOT NULL going forward and review authenticity now requires a
-- released milestone. If pre-escrow reviews must be preserved, back them up
-- before running this migration in any environment with existing Review rows.
DELETE FROM "Review" WHERE "milestoneId" IS NULL;

ALTER TABLE "Review" ALTER COLUMN "milestoneId" SET NOT NULL;

DROP INDEX IF EXISTS "Review_projectId_reviewerId_key";

CREATE UNIQUE INDEX "Review_milestoneId_key" ON "Review"("milestoneId");

ALTER TABLE "Review" ADD CONSTRAINT "Review_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
