-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "EmailDeliveryLog" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "messageId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateKey" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "eventType" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_messageId_idx" ON "EmailDeliveryLog"("messageId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_toEmail_createdAt_idx" ON "EmailDeliveryLog"("toEmail", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_status_createdAt_idx" ON "EmailDeliveryLog"("status", "createdAt");
