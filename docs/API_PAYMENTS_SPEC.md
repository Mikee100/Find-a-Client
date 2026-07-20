# Payments and Escrow API Specification

This document defines v1 API contracts for milestone-based payments and payout onboarding.

## Scope
- Stripe Connect onboarding status for developers
- Single-milestone lifecycle: create, fund, submit, release, dispute
- Payment and payout tracking records
- Review unlock trigger on released milestone

## Conventions
- Auth: JWT session (existing platform auth)
- Response envelope: existing success/error format
- Currency: ISO-4217 uppercase (for example USD)
- Monetary values: decimal strings in API payloads
- Idempotency: required for funding/release mutation endpoints

Headers:
- x-idempotency-key: required for POST /milestones/:id/fund and POST /milestones/:id/release

## Roles and Authorization
- Client can create milestones for own accepted hire request
- Client can fund/release own milestone
- Developer can submit own funded milestone
- Either party in milestone can dispute
- Admin can resolve disputes (manual v1)

## State Model
Milestone status values:
- PENDING
- FUNDED
- IN_PROGRESS
- SUBMITTED
- RELEASED
- DISPUTED
- REFUNDED

Allowed transitions v1:
- PENDING -> FUNDED
- FUNDED -> IN_PROGRESS (optional internal step)
- FUNDED or IN_PROGRESS -> SUBMITTED
- SUBMITTED -> RELEASED
- SUBMITTED -> DISPUTED
- DISPUTED -> RELEASED or REFUNDED (admin resolution)

## Endpoints

## 1) Create milestone
POST /hire-requests/:id/milestones

Description:
- Client defines one milestone for an accepted hire request (v1 single-milestone policy)

Request body:
```json
{
  "title": "MVP delivery",
  "amount": "2500.00",
  "currency": "USD",
  "dueDate": "2026-08-20T00:00:00.000Z"
}
```

Response 201:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "hireRequestId": "uuid",
    "title": "MVP delivery",
    "amount": "2500.00",
    "currency": "USD",
    "status": "PENDING",
    "dueDate": "2026-08-20T00:00:00.000Z",
    "fundedAt": null,
    "releasedAt": null,
    "createdAt": "2026-07-13T12:00:00.000Z"
  }
}
```

Errors:
- 403 if requester is not the owning client
- 409 if hire request not in eligible status or milestone already exists in v1

## 2) Fund milestone
POST /milestones/:id/fund

Description:
- Creates Stripe PaymentIntent and marks milestone funded after payment confirmation

Required headers:
- x-idempotency-key

Request body:
```json
{
  "paymentMethodId": "pm_...",
  "returnUrl": "https://app.example.com/client/hire-requests"
}
```

Response 200:
```json
{
  "success": true,
  "data": {
    "milestoneId": "uuid",
    "status": "FUNDED",
    "payment": {
      "id": "uuid",
      "stripePaymentIntentId": "pi_...",
      "amount": "2500.00",
      "feeAmount": "250.00",
      "status": "SUCCEEDED"
    },
    "fundedAt": "2026-07-13T13:00:00.000Z"
  }
}
```

Errors:
- 400 invalid payment method/request
- 402 payment required or card failure
- 409 invalid milestone state
- 422 currency mismatch or amount validation failure

## 3) Submit milestone delivery
POST /milestones/:id/submit

Description:
- Developer marks milestone as delivered

Request body:
```json
{
  "deliveryNote": "MVP deployed to staging and docs attached.",
  "artifacts": [
    "https://example.com/staging-url",
    "https://example.com/release-notes"
  ]
}
```

Response 200:
```json
{
  "success": true,
  "data": {
    "milestoneId": "uuid",
    "status": "SUBMITTED",
    "submittedAt": "2026-07-18T18:30:00.000Z"
  }
}
```

Errors:
- 403 requester is not assigned developer
- 409 milestone not in fundable/submittable state

## 4) Release milestone funds
POST /milestones/:id/release

Description:
- Client approves delivery, triggers payout scheduling and unlocks review eligibility

Required headers:
- x-idempotency-key

Request body:
```json
{
  "note": "Approved and released"
}
```

Response 200:
```json
{
  "success": true,
  "data": {
    "milestoneId": "uuid",
    "status": "RELEASED",
    "releasedAt": "2026-07-19T09:20:00.000Z",
    "payout": {
      "id": "uuid",
      "developerId": "uuid",
      "amount": "2250.00",
      "status": "PENDING"
    },
    "reviewUnlocked": true
  }
}
```

Errors:
- 403 requester is not owning client
- 409 milestone not in SUBMITTED state

## 5) Raise dispute
POST /milestones/:id/dispute

Description:
- Either client or developer raises a dispute and freezes release path

Request body:
```json
{
  "reason": "Scope mismatch between agreed deliverables and submitted artifacts."
}
```

Response 201:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "milestoneId": "uuid",
    "raisedBy": "CLIENT",
    "status": "OPEN",
    "createdAt": "2026-07-19T10:00:00.000Z"
  }
}
```

Errors:
- 409 if milestone already RELEASED or REFUNDED

## 6) Developer payout onboarding status
GET /developers/:id/payout-account/status

Description:
- Returns Stripe Connect onboarding state and next action URL if needed

Response 200:
```json
{
  "success": true,
  "data": {
    "developerId": "uuid",
    "provider": "stripe_connect",
    "accountId": "acct_...",
    "chargesEnabled": false,
    "payoutsEnabled": false,
    "detailsSubmitted": false,
    "onboardingRequired": true,
    "onboardingUrl": "https://connect.stripe.com/setup/..."
  }
}
```

## Supporting Endpoints (Recommended)
- GET /hire-requests/:id/milestones
- GET /milestones/:id
- GET /milestones/:id/events
- POST /admin/disputes/:id/resolve

## Webhooks
Endpoint:
- POST /payments/webhooks/stripe

Events to handle:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
- transfer.created
- transfer.failed
- payout.paid
- payout.failed

Webhook processing requirements:
- Verify Stripe signature
- Persist raw event id for dedupe
- Idempotent handler (at-least-once delivery safe)
- Log transition and emit internal domain event

## Error Codes (Proposed)
- PAYMENT_INVALID_STATE
- PAYMENT_PROVIDER_ERROR
- PAYMENT_AUTHORIZATION_REQUIRED
- PAYOUT_ACCOUNT_INCOMPLETE
- MILESTONE_NOT_FOUND
- MILESTONE_NOT_OWNED
- DISPUTE_NOT_ALLOWED
- IDEMPOTENCY_KEY_REQUIRED
- IDEMPOTENCY_CONFLICT

## Review Unlock Rule
Review creation validation (projects/:slug/reviews):
- Must reference a released milestone tied to hire request between same client and developer
- One review per released milestone per client

## Security and Compliance Notes
- Never store raw card data
- Store provider references only (PaymentIntent/Transfer ids)
- Mask sensitive payment payload fields in logs
- Apply stricter rate limits on fund/release/dispute endpoints
- Require CSRF protection on state-changing payment endpoints

## Testing Matrix (Minimum)
1. Happy path: create -> fund -> submit -> release
2. Unauthorized actor for each endpoint
3. Invalid state transitions
4. Duplicate idempotency key reuse safety
5. Webhook replay safety
6. Dispute freeze correctness
7. Review unlock only after release
