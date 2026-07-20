# Find a Client - Roadmap Execution Plan

This plan turns the product roadmap into executable engineering work with clear dependencies, acceptance criteria, and measurable outcomes.

## Planning Window
- Horizon: 90 days
- Operating cadence: 2-week sprints
- Release model: incremental, feature-flagged where needed

## Strategic Goal
Convert Find a Client from a high-quality discovery and messaging platform into a true transaction marketplace with:
- on-platform payment closure
- engagement-gated trust
- outcome-based ranking
- anti-spam quality controls
- clear wedge positioning for go-to-market

## Workstreams

## W1: Payments and Escrow (Critical Path)
Outcome:
- Client funds work on-platform
- Developer can deliver and get paid on-platform
- Platform captures value via take rate

Epics:
1. Stripe Connect onboarding
2. Single-milestone escrow lifecycle
3. Payout and settlement records
4. Dispute freeze and admin resolution workflow (manual v1)
5. Monetization (take-rate) implementation

Dependencies:
- None for onboarding and schema
- Stripe keys and webhook setup required before production rollout

Definition of done:
- End-to-end flow: accepted hire request -> milestone created -> funded -> submitted -> released -> payout queued
- Audit events and payment records stored for every state transition
- Idempotent payment endpoints and webhook processing

## W2: Trust and Review Gating (Critical Path)
Outcome:
- Reviews represent completed paid work, not unverified testimonials

Epics:
1. Review eligibility gate tied to released milestones
2. Trust signal model and API exposure
3. Ranking integration with outcome metrics

Dependencies:
- W1 single-milestone release flow

Definition of done:
- Review creation blocked unless linked milestone is RELEASED
- Trust signals exposed as distinct fields: identityVerified, workVerified, codeVerified
- Ranking breakdown includes outcome factors

## W3: Quality Control / Anti-Spam (Parallel)
Outcome:
- Lower spam and low-quality supply without heavy moderation overhead

Epics:
1. New-account message/project rate policies
2. Low-confidence project signal weighting (missing/invalid demo-repo)
3. Flagged moderation queue

Dependencies:
- None (can run in parallel)

Definition of done:
- Policy config exists and enforced
- Flag queue visible in admin tooling
- Ranking de-weights flagged/low-confidence projects

## W4: GTM Wedge Execution (Parallel)
Outcome:
- Stronger positioning and faster marketplace liquidity

Epics:
1. Choose one 90-day niche focus
2. Niche landing content and discovery messaging
3. Curated supply campaign and case-study loop

Dependencies:
- None for decision and messaging

Definition of done:
- One declared wedge in docs and marketing copy
- Discovery pages reflect wedge context
- At least 3 niche-aligned project case studies live

## W5: Existing Gaps (After Outcome Data Starts Flowing)
Outcome:
- Strong analytics and polished trust/product UX

Epics:
1. AI UX integration
2. KPI and analytics hardening
3. Trust/verification UI polish
4. Cross-role product consistency pass

Dependencies:
- KPI hardening depends on W1/W2 outcome events

Definition of done:
- KPI dashboards use authoritative backend metrics
- AI surfaces are data-backed and measurable
- Role flows have consistent copy, error states, and action hierarchy

## 90-Day Sequence

## Phase 0 (Week 1)
- Finalize monetization policy and legal/payment constraints
- Add feature flags for payments and trust gating
- Add observability fields for payment/review/ranking events

## Phase 1 (Weeks 2-4)
- Implement milestone/payment/payout/dispute schema
- Build Stripe Connect onboarding status flow
- Implement single-milestone fund/submit/release/dispute APIs

Exit criteria:
- Test environment supports full transaction loop with test cards

## Phase 2 (Weeks 5-6)
- Gate reviews to released milestones only
- Add trust signal fields and API surface
- Add ranking weights for completion/on-time/rating

Exit criteria:
- Outcome-based ranking active in non-prod

## Phase 3 (Weeks 7-8)
- Ship anti-spam throttles and moderation queue
- Launch niche-specific discovery/landing updates

Exit criteria:
- Moderation queue operational
- Wedge content live on public surfaces

## Phase 4 (Weeks 9-12)
- AI UX integration and instrumentation
- KPI dashboard hardening
- Trust UI and consistency polish
- Release readiness pass (security/perf/rollback/playbook)

Exit criteria:
- Production sign-off checklist completed

## Sprint Backlog Starter (Engineering)

1. Add milestone-related enums and tables in Prisma
2. Implement milestone service with state machine guards
3. Add Stripe Connect onboarding initiation + account status retrieval
4. Add PaymentIntent creation and idempotency handling
5. Add webhook handler for payment success/failure reconciliation
6. Implement milestone submit/release/dispute endpoints and auth policies
7. Implement payout record creation and transfer dispatch abstraction
8. Add review-eligibility validator and enforce in reviews module
9. Extend ranking service with completion and rating factors
10. Extend throttling policies for new-account anti-spam controls
11. Add flagged-project detection job and admin queue endpoint
12. Add analytics events for transaction and outcome lifecycle

## Acceptance Criteria by Domain

Payments:
- Single milestone can be created, funded, submitted, released
- Dispute blocks release until resolved
- Every state transition is persisted and auditable

Trust:
- Reviews cannot be created without released milestone
- Work verified signal turns true only after released milestone

Ranking:
- Ranking response includes outcome-based factors with explanation

Quality control:
- New-account rate policy enforced for project creation and outbound messages
- Flagged items visible in admin queue

## KPI Targets (Initial)
- Funded milestone rate: >= 30% of accepted hire requests
- Milestone release rate: >= 70% of funded milestones
- On-platform completion rate: increasing sprint-over-sprint
- Review attach rate: >= 60% of released milestones
- Median time to first milestone funding: <= 72 hours from proposal acceptance

## Risks and Mitigations

Risk: payment complexity delays delivery
- Mitigation: strict single-milestone v1 scope and manual disputes

Risk: legal/compliance uncertainty
- Mitigation: use Stripe Connect Standard/Express and platform does not directly custody funds

Risk: ranking volatility after outcome-weight changes
- Mitigation: launch behind feature flag and monitor impact before full rollout

Risk: niche selection indecision
- Mitigation: timebox wedge decision to one sprint with explicit owner

## Ownership (Suggested)
- Backend lead: payment lifecycle, trust gating, ranking integration
- Frontend lead: milestone UX, trust surfaces, KPI UI
- Product lead: wedge selection, monetization policy, acceptance criteria
- Ops/SRE: webhook reliability, alerting, release runbooks
- Admin/moderation owner: dispute SOP and flagged queue process

## Release Gates
- Gate 1: Payments integration test pass
- Gate 2: Review gating correctness pass
- Gate 3: Ranking outcome-factor sanity pass
- Gate 4: Security and rollback checklist pass
- Gate 5: Product analytics validation pass

## Linked Specs
- API contract: docs/API_PAYMENTS_SPEC.md
- Prisma model/migrations: docs/PRISMA_MILESTONES_SCHEMA.md
- Product roadmap context: README.md
