# Prisma Milestones Schema Plan

This document defines the Prisma schema extensions for milestone-based payments, disputes, and payout tracking.

## Design Goals
- Keep v1 simple: one milestone per accepted hire request
- Preserve auditability for financial transitions
- Support idempotent provider reconciliation
- Enable review gating from released milestones

## New Enums

```prisma
enum MilestoneStatus {
  PENDING
  FUNDED
  IN_PROGRESS
  SUBMITTED
  RELEASED
  DISPUTED
  REFUNDED
}

enum PaymentStatus {
  REQUIRES_PAYMENT_METHOD
  REQUIRES_CONFIRMATION
  REQUIRES_ACTION
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELED
  REFUNDED
}

enum PayoutStatus {
  PENDING
  IN_TRANSIT
  PAID
  FAILED
  CANCELED
}

enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED_RELEASE
  RESOLVED_REFUND
  CANCELED
}

enum DisputeRaisedBy {
  CLIENT
  DEVELOPER
  SYSTEM
}
```

## New Models

```prisma
model Milestone {
  id            String          @id @default(uuid()) @db.Uuid
  hireRequestId String          @db.Uuid
  title         String          @db.VarChar(160)
  amount        Decimal         @db.Decimal(12, 2)
  currency      String          @db.Char(3)
  status        MilestoneStatus @default(PENDING)
  dueDate       DateTime?
  fundedAt      DateTime?
  submittedAt   DateTime?
  releasedAt    DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  hireRequest   HireRequest     @relation(fields: [hireRequestId], references: [id], onDelete: Cascade)
  payments      Payment[]
  payouts       Payout[]
  disputes      Dispute[]

  @@unique([hireRequestId], map: "ux_milestone_hire_request_single_v1")
  @@index([status, createdAt], map: "idx_milestone_status_created")
  @@index([hireRequestId, status], map: "idx_milestone_hire_status")
}

model Payment {
  id                     String        @id @default(uuid()) @db.Uuid
  milestoneId            String        @db.Uuid
  stripePaymentIntentId  String        @unique @db.VarChar(120)
  amount                 Decimal       @db.Decimal(12, 2)
  feeAmount              Decimal       @default(0) @db.Decimal(12, 2)
  currency               String        @db.Char(3)
  status                 PaymentStatus @default(REQUIRES_CONFIRMATION)
  idempotencyKey         String?       @db.VarChar(120)
  providerPayload        Json?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  milestone              Milestone     @relation(fields: [milestoneId], references: [id], onDelete: Cascade)

  @@index([milestoneId, createdAt], map: "idx_payment_milestone_created")
  @@index([status, createdAt], map: "idx_payment_status_created")
  @@index([idempotencyKey], map: "idx_payment_idempotency")
}

model Payout {
  id                 String       @id @default(uuid()) @db.Uuid
  milestoneId        String       @db.Uuid
  developerId        String       @db.Uuid
  stripeTransferId   String?      @unique @db.VarChar(120)
  amount             Decimal      @db.Decimal(12, 2)
  currency           String       @db.Char(3)
  status             PayoutStatus @default(PENDING)
  providerPayload    Json?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  milestone          Milestone    @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  developer          User         @relation(fields: [developerId], references: [id], onDelete: Cascade)

  @@index([developerId, createdAt], map: "idx_payout_developer_created")
  @@index([status, createdAt], map: "idx_payout_status_created")
  @@index([milestoneId], map: "idx_payout_milestone")
}

model Dispute {
  id                 String          @id @default(uuid()) @db.Uuid
  milestoneId        String          @db.Uuid
  raisedBy           DisputeRaisedBy
  raisedByUserId     String?         @db.Uuid
  reason             String
  status             DisputeStatus   @default(OPEN)
  resolution         String?
  resolvedByUserId   String?         @db.Uuid
  resolvedAt         DateTime?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  milestone          Milestone       @relation(fields: [milestoneId], references: [id], onDelete: Cascade)

  @@index([milestoneId, status], map: "idx_dispute_milestone_status")
  @@index([createdAt], map: "idx_dispute_created")
}
```

## Existing Model Updates

## HireRequest
Add relation to milestones:

```prisma
model HireRequest {
  // existing fields...
  milestones Milestone[]
}
```

## Review
Option A (recommended): tie review to milestone for strict gating and audit clarity.

```prisma
model Review {
  // existing fields...
  milestoneId String?   @db.Uuid
  milestone   Milestone? @relation(fields: [milestoneId], references: [id], onDelete: SetNull)

  @@unique([milestoneId], map: "ux_review_milestone_one_review")
}
```

If business allows multiple reviews per milestone later, remove unique and enforce policy in service layer.

## User (optional payout profile fields)
If you want to persist onboarding state locally for fast reads:

```prisma
model User {
  // existing fields...
  stripeAccountId         String?  @unique @db.VarChar(120)
  stripeChargesEnabled    Boolean  @default(false)
  stripePayoutsEnabled    Boolean  @default(false)
  stripeDetailsSubmitted  Boolean  @default(false)
}
```

## Migration Order

1. Add enums:
- MilestoneStatus
- PaymentStatus
- PayoutStatus
- DisputeStatus
- DisputeRaisedBy

2. Create tables:
- Milestone
- Payment
- Payout
- Dispute

3. Add relations:
- HireRequest.milestones
- optional Review.milestoneId
- optional User stripe account fields

4. Add indexes and constraints:
- one milestone per hire request in v1 (unique hireRequestId)
- provider ids unique
- status/date indexes

5. Backfill strategy:
- No historical backfill required for v1 if payment flow is new
- Existing reviews remain valid legacy records unless hard policy migration is required

## Service-Level Invariants
- Milestone currency must match hire request proposal currency (or explicit default)
- Payment amount must equal milestone amount in v1
- Milestone status transitions must follow finite state rules
- Dispute OPEN blocks release until RESOLVED_RELEASE or RESOLVED_REFUND
- Review creation requires linked milestone with RELEASED status

## Recommended Additional Audit Table
For traceability and debugging:

```prisma
model MilestoneEvent {
  id           String   @id @default(uuid()) @db.Uuid
  milestoneId  String   @db.Uuid
  eventType    String   @db.VarChar(80)
  actorUserId  String?  @db.Uuid
  payload      Json?
  createdAt    DateTime @default(now())

  milestone    Milestone @relation(fields: [milestoneId], references: [id], onDelete: Cascade)

  @@index([milestoneId, createdAt], map: "idx_milestone_event_created")
}
```

## Performance Notes
- Keep status + createdAt indexes on payment and payout for dashboard queries
- Keep milestone status index for operational queues
- Use partial indexes later if queue volume becomes large

## Open Decisions
1. Refund behavior: full-only in v1 or partial allowed?
2. Auto-release timeout policy after submit (if client inactive)
3. Platform fee model: flat + percent vs percent-only
4. Whether review is mandatory or optional after released milestone

## Related Docs
- docs/API_PAYMENTS_SPEC.md
- docs/ROADMAP_EXECUTION_PLAN.md
- README.md
