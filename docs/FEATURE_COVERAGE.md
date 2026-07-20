# Feature Coverage Matrix

This document maps implemented capabilities, maturity, evidence, and gaps across backend and frontend.

Status legend:
- COMPLETE: implemented and available in current codebase
- PARTIAL: implemented but missing key production behavior
- PLANNED: not implemented yet, documented target

Last updated: 2026-07-13

## 1) Platform Foundation

| Area | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Monorepo structure | COMPLETE | `frontend/`, `backend/`, `docs/` | None |
| Backend module composition | COMPLETE | `backend/src/app.module.ts` imports auth/users/projects/messages/hire-requests/media/notifications/reviews/search/admin/ai/platform | Platform module is parallel track to marketplace |
| Frontend app shell | COMPLETE | Next.js App Router in `frontend/src/app` | Route-level consistency still needs polish |
| API response envelope | COMPLETE | Backend docs + interceptors in app module | Keep strict envelope in new payment APIs |

## 2) Auth, Identity, and Security

| Capability | Status | Backend Endpoints | Gap / Notes |
|---|---|---|---|
| Register/login | COMPLETE | `POST /auth/register`, `POST /auth/login` | None |
| Session/refresh/logout | COMPLETE | `GET /auth/session`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all` | None |
| Email verification flow | COMPLETE | `POST /auth/verify-email`, `POST /auth/verify-email/status`, `POST /auth/resend-verification` | UX polish possible |
| Password reset/change | COMPLETE | `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password` | None |
| OAuth (Google/GitHub) | PARTIAL | `GET /auth/google`, `GET /auth/github`, `POST /auth/oauth/session`, `POST /auth/github/verify` | Production credential and trust UX hardening |
| Global rate limiting | COMPLETE | Throttler guard in `app.module.ts` | Extend for anti-spam quality controls |
| Audit/session persistence | COMPLETE | `RefreshSession`, `AuthAuditLog`, `AuthActionToken` in schema | Add payment/audit events for milestones |

## 3) Developer Profiles and Portfolio

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Developer profile fields | COMPLETE | `User` model contains title/skills/stack/experience/availability/social links | Completeness guidance can improve |
| Profile endpoints | COMPLETE | `GET /users/me`, `GET /users/me/completeness`, `GET /users/:username`, `GET /users/developers/search` | Add outcomes-based trust signals |
| Project CRUD and listing | COMPLETE | `POST /projects`, `GET /projects`, `GET /projects/:slug`, `DELETE /projects/:slug` | No payment linkage yet |
| Portfolio engagement signals | COMPLETE | like/save/inquiry/question/review endpoints + counters in `Project` model | Ranking should weight engagement quality, not only volume |
| Media handling | COMPLETE | `POST /media/upload`, `DELETE /media/:publicId` | Add stricter policy checks for asset quality (optional) |

## 4) Discovery, Search, and Ranking

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Project search endpoint | COMPLETE | `GET /search` | Maintain performance as filters expand |
| Developer discovery endpoint | COMPLETE | `GET /users/developers/search` | Needs outcome-based ranking factors (post payments) |
| Explainable ranking output | PARTIAL | Existing ranking breakdown logic (per docs/roadmap context) | Must include completion/on-time/released-milestone factors |
| Public discovery surfaces | COMPLETE | Frontend routes `/developers`, `/developers/:username`, `/projects`, `/projects/:slug` | Needs niche-focused content strategy |

## 5) Messaging, Notifications, and Hiring Lifecycle

| Capability | Status | Endpoints | Gap / Notes |
|---|---|---|---|
| Thread creation/listing/read | COMPLETE | `POST /messages/threads`, `GET /messages/threads`, `GET /messages/threads/:id` | None |
| Send message and attachments | COMPLETE | `POST /messages/threads/:id`, `POST /messages/threads/:id/attachments` | Add anti-spam policy tuning |
| Quick replies | COMPLETE | `GET /messages/quick-replies` | May need role/persona-specific templates |
| Notifications feed + unread | COMPLETE | `GET /notifications`, `GET /notifications/unread-count` | Add payment/dispute notification types when implemented |
| Hire requests lifecycle | COMPLETE | `POST /hire-requests`, `GET /hire-requests`, `GET /hire-requests/:id`, `PATCH /hire-requests/:id/status`, `PATCH /hire-requests/:id/proposal` | Lifecycle currently ends at proposal terms; no on-platform funding |

## 6) AI Features

| Capability | Status | Endpoints | Gap / Notes |
|---|---|---|---|
| Client-to-developer matching API | COMPLETE | `POST /ai/match/client-to-developers` | Frontend adoption uneven |
| Profile improvement API | COMPLETE | `POST /ai/match/profile-improvements` | Must add quality instrumentation |
| Proposal template API | COMPLETE | `POST /ai/assist/proposal-template` | Add conversion telemetry |
| AI in UX | PARTIAL | AI lab and dashboard placeholders/routes exist | Need consistent role flow integration and explainability |

## 7) Admin and Operations

| Capability | Status | Endpoints | Gap / Notes |
|---|---|---|---|
| Admin users and controls | COMPLETE | `GET /admin/users`, `GET /admin/users/:id`, patch access/password/role/verification | None |
| Performance telemetry endpoints | COMPLETE | `GET /admin/performance/summary`, `GET /admin/performance/routes` | Expand with payment outcome metrics |
| Moderation view | COMPLETE | `GET /admin/moderation` | Add flagged queue automation for anti-spam roadmap |

## 8) Payment, Escrow, and Monetization

| Capability | Status | Target Spec | Gap / Notes |
|---|---|---|---|
| Milestone schema | PLANNED | `docs/PRISMA_MILESTONES_SCHEMA.md` | Not in current Prisma schema |
| Funding/release flow | PLANNED | `docs/API_PAYMENTS_SPEC.md` | Not implemented |
| Stripe Connect onboarding status | PLANNED | `GET /developers/:id/payout-account/status` | Not implemented |
| Dispute handling | PLANNED | Milestone dispute endpoints and admin resolve path | Not implemented |
| Take-rate monetization | PLANNED | Roadmap critical path | Policy + implementation pending |

## 9) Trust System Maturity

| Trust signal | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Identity verified | PARTIAL | OAuth and verification flags exist | Clarify badge semantics in UX |
| Work verified | PLANNED | Roadmap requires released-milestone gating | Needs milestone release data |
| Code verified | PLANNED | AI-assisted optional roadmap item | Needs implementation spec after payments |
| Review authenticity gate | PLANNED | Roadmap requires review <- released milestone rule | Needs model update + service validation |

## 10) Release-Critical Gaps Summary

1. Transaction closure loop (milestone fund -> release -> payout) is not yet implemented.
2. Review authenticity is not yet payment/release-gated.
3. Ranking does not yet consume validated outcome metrics from paid engagements.
4. Anti-spam controls need explicit policy extension and flagged moderation queue automation.
5. Niche-focused GTM execution is not yet codified in public-facing content.

## Linked Roadmap Docs
- Execution plan: `docs/ROADMAP_EXECUTION_PLAN.md`
- Payments API spec: `docs/API_PAYMENTS_SPEC.md`
- Prisma schema plan: `docs/PRISMA_MILESTONES_SCHEMA.md`
- Launch gates: `docs/RELEASE_READINESS.md`
