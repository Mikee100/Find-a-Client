-- CreateEnum
CREATE TYPE "HireRequestStatus" AS ENUM ('PENDING', 'REVIEWING', 'PROPOSAL_SENT', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "HireRequest" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "developerId" UUID NOT NULL,
    "projectId" UUID,
    "threadId" UUID,
    "status" "HireRequestStatus" NOT NULL DEFAULT 'PENDING',
    "brief" TEXT NOT NULL,
    "budgetAmount" DECIMAL(10,2),
    "budgetCurrency" VARCHAR(3),
    "timelineDays" INTEGER,
    "proposalMessage" TEXT,
    "proposalAmount" DECIMAL(10,2),
    "proposalCurrency" VARCHAR(3),
    "proposalTimelineDays" INTEGER,
    "proposedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HireRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HireRequest_clientId_createdAt_idx" ON "HireRequest"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "HireRequest_developerId_createdAt_idx" ON "HireRequest"("developerId", "createdAt");

-- CreateIndex
CREATE INDEX "HireRequest_status_createdAt_idx" ON "HireRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "HireRequest_projectId_idx" ON "HireRequest"("projectId");

-- CreateIndex
CREATE INDEX "HireRequest_threadId_idx" ON "HireRequest"("threadId");

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
