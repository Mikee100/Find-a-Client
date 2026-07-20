# Release Readiness Checklist

This checklist is the launch gate for Find a Client moving from pre-production to production.

Use this file as a pass/fail control sheet. A release should ship only when all P0 gates pass.

Status legend:
- PASS
- FAIL
- WAIVED (requires written approval and owner)

Last updated: 2026-07-13

## Release Scope
Target release type:
- [ ] Payments alpha (internal)
- [ ] Payments beta (limited users)
- [ ] General availability

Target date:
- TBD

Release owner:
- TBD

## P0 Gates (Must Pass)

## 1) Security and Secrets
- [ ] No live secrets committed in repository history for active environments
- [ ] Production secrets rotated and stored in provider secret manager
- [ ] JWT/auth/cookie settings reviewed for production domains
- [ ] CSRF protection validated for all state-changing endpoints
- [ ] Sensitive logging redaction confirmed

Evidence:
- Secret rotation ticket:
- Security review link:

## 2) Core Availability and Health
- [ ] Backend health endpoint stable (`GET /health`)
- [ ] App startup succeeds in production-like environment
- [ ] Graceful failure modes validated for Redis unavailable case
- [ ] Database connectivity and migration strategy validated

Evidence:
- Staging smoke test run:
- Incident runbook location:

## 3) Transaction Integrity (Payments Release)
- [ ] Milestone state transitions enforce allowed finite-state paths
- [ ] Idempotency required and enforced on fund/release endpoints
- [ ] Stripe webhook signatures validated and replay-safe
- [ ] Payment and payout records reconcile correctly
- [ ] Dispute state freezes release path until resolution

Evidence:
- Payment integration test report:
- Webhook replay test report:

## 4) Trust Integrity
- [ ] Review creation restricted to released milestones
- [ ] Work-verified trust signal only set by released milestone data
- [ ] Ranking uses outcome metrics (completion/on-time/rating) with fallback behavior documented

Evidence:
- Review gating test report:
- Ranking factor validation report:

## 5) Data and Migration Safety
- [ ] Prisma migration dry-run completed in staging clone
- [ ] Migration rollback approach documented
- [ ] Backward compatibility impact assessed
- [ ] Index and query performance checked after migration

Evidence:
- Migration execution log:
- Query/perf check output:

## P1 Gates (Should Pass Before GA)

## 6) Product and UX Quality
- [ ] Cross-role flow QA: developer, client, admin
- [ ] Consistent error states and recovery actions on critical paths
- [ ] Empty/loading states reviewed on discovery and messaging screens
- [ ] Niche GTM messaging reflected on public discovery pages

Evidence:
- UX QA checklist:
- Product sign-off note:

## 7) Anti-Spam and Moderation
- [ ] New-account rate limits for outbound messages and project creation are active
- [ ] Flagged project queue visible to admin
- [ ] Moderation SOP for flagged content and disputes documented

Evidence:
- Throttle policy config:
- Admin moderation SOP:

## 8) Observability and Alerting
- [ ] Structured logs available for auth, hire request, payment, and dispute events
- [ ] Error-rate and latency dashboards configured
- [ ] Alerts configured for payment failures and webhook failures
- [ ] Alert routing and on-call ownership documented

Evidence:
- Dashboard links:
- Alert policy links:

## 9) Performance and Reliability
- [ ] Load test for search/discovery endpoints completed
- [ ] Messaging throughput and unread counters validated under concurrency
- [ ] Payment endpoints tested for retry/idempotency under repeated calls

Evidence:
- Load test report:
- Concurrency test report:

## 10) Compliance and Policy
- [ ] Terms and policy language updated for payments/escrow/take-rate model
- [ ] Dispute policy published and linked in product
- [ ] Data retention policy reviewed for payment and dispute records

Evidence:
- Legal policy links:
- Approval record:

## Go / No-Go Decision

Decision:
- [ ] GO
- [ ] NO-GO

Decision date:
- TBD

Approvers:
- Engineering:
- Product:
- Operations:
- Security:

Blocking issues (if NO-GO):
1.
2.
3.

## Post-Release Monitoring (First 72 Hours)

## KPIs to watch
- API error rate
- Auth/session failure rate
- Milestone funding success rate
- Milestone release success rate
- Dispute creation rate
- Review attach rate per released milestone

## Response thresholds
- If payment failure rate > 5% over 1 hour: trigger incident and consider feature rollback
- If webhook processing lag > 10 minutes: page on-call and pause auto-release jobs
- If auth failure spikes > 2x baseline: investigate session/cookie regression immediately

## Rollback Triggers
- Corrupt or inconsistent payment state transitions
- Unrecoverable webhook processing failure
- Security issue affecting auth or payment endpoints
- Severe ranking regression harming core discovery quality

## Related Docs
- Product status and roadmap: `README.md`
- Feature matrix: `docs/FEATURE_COVERAGE.md`
- Execution plan: `docs/ROADMAP_EXECUTION_PLAN.md`
- Payments API: `docs/API_PAYMENTS_SPEC.md`
- Prisma schema plan: `docs/PRISMA_MILESTONES_SCHEMA.md`
