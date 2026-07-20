# Find a Client

Find a Client is a two-sided marketplace platform where developers publish real work, clients discover talent, both sides message in context, and hiring moves through a tracked request/proposal lifecycle.

This repository contains the full product in a monorepo:
- `frontend/`: Next.js App Router web app
- `backend/`: NestJS API with Prisma/PostgreSQL
- `docs/`: architecture, workflows, deployment, and product planning

## What The System Is About

The core product outcome is simple:
- Help developers prove capability through portfolio evidence (projects, stacks, media, profile quality)
- Help clients reduce hiring risk through searchable discovery, ranking signals, and direct communication
- Move from interest to hire with a structured workflow, not just untracked DMs

## Current Status (As Of 2026-07-13)

Overall maturity: **strong pre-production foundation** with major core workflows implemented.

The platform is already solid in:
- Authentication and session security hardening
- Developer profile + project publishing flows
- Discovery/search with ranking output
- Messaging, notifications, and hire request lifecycle
- Milestone-based payment and payout backend flow (Stripe-integrated)
- Engagement-gated reviews (released milestone required)
- Backend performance infrastructure (caching and indexes)

What still needs focused work before enterprise-grade launch:
- Full AI UX integration and explainability surfaces in frontend
- Outcome-weighted ranking integration (completion/on-time/released-milestone metrics)
- Deeper analytics/KPI instrumentation
- Product polish for consistency across routes and role journeys
- Release-ops hardening (webhook reliability, alerting, rollback drills)

## Architecture At A Glance

### Frontend
- Next.js (App Router), React 19, TypeScript
- Role-based route structure (`/developer/*`, `/client/*`, `/admin/*`) with compatibility redirects
- Public discovery routes (`/developers`, `/projects`)

### Backend
- NestJS 11, TypeScript strict mode
- Prisma ORM + PostgreSQL
- Modules: auth, users, projects, messages, hire-requests, milestones, notifications, reviews, search, media, ai, admin
- Health endpoint: `GET /health`

### Infrastructure and Integrations
- Supabase: auth/realtime support
- Cloudinary: media and attachment pipeline
- Email: SMTP or Resend
- Redis: cache layer (with graceful fallback behavior)
- Render deployment config included (`render.yaml`)

## Feature Inventory (Implemented)

## 1) Auth, Identity, and Security
- Registration/login with role-aware identity model
- Access + refresh token lifecycle with hardened cookie/session handling
- Session endpoint and logout/logout-all behavior
- Email verification + password reset/change flows
- OAuth support paths for Google and GitHub
- Endpoint-level and global throttling/rate limiting
- Auth event/audit persistence (`AuthAuditLog`, `RefreshSession`, `AuthActionToken`)

## 2) Developer Profiles and Portfolio
- Rich developer profile fields:
    - title, bio, skills, primary stack
    - experience level and availability status
    - social links and optional public contact exposure
- Public developer discovery/profile view support
- Project publishing with:
    - category/status/lifecycle
    - tech stack and industries
    - pricing model (fixed/negotiable/free/contact)
    - demo/repository/role metadata and visual assets
- Project engagement signals:
    - views, likes, saves, inquiries
    - question and review support

## 3) Client Discovery and Matching
- Public project listing and project detail views
- Developer search endpoint with ranking output and relevance breakdown
- Filter-capable discovery across profile and project data
- AI endpoints available for:
    - client-to-developer matching
    - profile improvement suggestions
    - proposal template generation

## 4) Messaging, Notifications, and Hiring Flow
- Thread-based direct messaging between client and developer
- Thread creation with optional project context
- Message history retrieval, unread tracking, and read updates
- Quick replies support
- Message attachments upload path
- Notifications feed and unread counts
- End-to-end hire request lifecycle:
    - create request
    - list/get request
    - update status
    - submit/update proposal terms
- Milestone/payment lifecycle endpoints:
    - create milestone from hire request
    - fund milestone (Stripe payment intent)
    - submit delivery
    - release payout
    - raise dispute
    - payout account status retrieval

## 5) Admin and Operational Controls
- Admin user listing, inspection, and role/access adjustments
- Verification and moderation toggles
- Performance summary and route telemetry endpoints
- Moderation-focused admin surfaces

## 6) Platform Engine (Parallel Capability Track)
- A generic multi-tenant platform engine module exists under `backend/src/modules/platform`
- Includes blueprint/entity/capability architecture and pricing/inventory/tax/sales engines
- This is an advanced parallel track and should be treated as separate from the core Find a Client marketplace journey when planning release scope

## Frontend Route Coverage (Highlights)

Implemented route families include:
- Public:
    - `/`
    - `/developers`, `/developers/:username`
    - `/projects`, `/projects/:slug`
    - `/hire/:username`
- Auth:
    - register/login/forgot/reset/verify/callback/consent flows
- Developer:
    - dashboard, profile, settings, projects, projects/new, messages, hire-requests
- Client:
    - dashboard/feed/messages/likes/projects/new/settings/hire-requests/ai-lab
- Admin:
    - dashboard, users, user detail, performance, analytics, ranking-debug, settings, configurations

## Data Model Coverage (Marketplace Core)

Core marketplace entities already modeled in Prisma include:
- `User`, `Project`, `ProjectMedia`, `Tag`, `ProjectTag`
- `Thread`, `Message`, `MessageAttachment`
- `HireRequest`, `Milestone`, `Payment`, `Payout`, `Dispute`, `Question`, `Review`
- `Notification`, `Saved`, `ProjectLike`
- `RefreshSession`, `AuthAuditLog`, `AuthActionToken`, `EmailDeliveryLog`

This provides strong schema-level support for the full developer/client marketplace lifecycle.

## Where We Are Behind (Candid Gap Analysis)

These are the most important gaps right now:

## 1) AI Productization Gap
- Backend AI endpoints exist, but frontend adoption is still uneven
- Some role dashboards still rely on placeholders or non-final recommendation UX
- Need measurable AI quality metrics (acceptance rate, relevance, conversion impact)

## 2) Analytics and KPI Visibility
- Several dashboard cards still lack fully trusted computed metrics
- Need consistent KPI definitions for profile strength, inquiry-to-proposal, and response time
- Need stronger trend reporting for developer and client outcomes

## 3) Trust and Verification Experience
- Released-milestone gating is implemented for review integrity
- Trust signal UI semantics and policy communication are still not fully mature
- GitHub/identity trust explanation and badge governance should be tightened

## 4) Product Consistency and UX Coherence
- Route and feature breadth is high, but workflow consistency is not always uniform across roles
- Need standardization of copy, empty states, action hierarchy, and error/recovery patterns

## 5) Release Operations Discipline
- Environment security hygiene must stay strict (secret rotation policy, environment segregation, audit cadence)
- Need final pre-release checklist coverage: resilience, load behavior, rollback playbook, incident readiness

## Product Roadmap (90 Days)

This roadmap consolidates gap analysis with the highest-leverage marketplace loop: transaction, trust, quality, and positioning.

### 1) Where The Product Stands

The foundation is strong and includes:
- hardened auth/session security
- developer profiles and project publishing
- ranked discovery
- threaded messaging
- hire-request lifecycle through proposal terms

Core gap at business-model level: the current lifecycle still lacks an on-platform fund flow, so intent does not automatically become transaction.

### 2) Payment And Escrow Flow (Highest Leverage)

Why this is critical:
- Without payment rails, transactions can move off-platform after discovery and messaging.
- That weakens monetization, trust loop quality, and defensibility.

Current implementation status:
- Milestone data model and backend endpoints are implemented.
- Stripe-backed payment intent creation and transfer-based payout release are implemented in backend service flow.
- v1 remains single-milestone per hire request.
- Dispute resolution remains manual-admin process.

Proposed data model additions:

```ts
Milestone {
    id: string;
    hireRequestId: string;
    title: string;
    amount: number;
    currency: string;
    status: "pending" | "funded" | "in_progress" | "submitted" | "released" | "disputed" | "refunded";
    dueDate?: Date;
    fundedAt?: Date;
    releasedAt?: Date;
}

Payment {
    id: string;
    milestoneId: string;
    stripePaymentIntentId: string;
    amount: number;
    feeAmount: number;
    status: string;
    createdAt: Date;
}

Payout {
    id: string;
    developerId: string;
    stripeTransferId: string;
    amount: number;
    status: string;
    createdAt: Date;
}

Dispute {
    id: string;
    milestoneId: string;
    raisedBy: string;
    reason: string;
    status: string;
    resolution?: string;
    createdAt: Date;
}
```

Proposed backend endpoints:
- `POST /hire-requests/:id/milestones`
- `POST /milestones/:id/fund`
- `POST /milestones/:id/submit`
- `POST /milestones/:id/release`
- `POST /milestones/:id/dispute`
- `GET /developers/:id/payout-account/status`

Recommended sequencing for payments:
1. Stripe Connect onboarding for developers.
2. Single-milestone flow only (v1).
3. Manual dispute handling in admin panel.
4. Multi-milestone support once volume justifies complexity.

### 3) Trust And Review System (Engagement-Gated)

Design rule (implemented):
- Reviews are only allowed for milestones with status `released`.
- No released milestone, no review.

Trust should be split into distinct signals:
- Identity verified: persistent identity via OAuth-backed account linkage.
- Work verified: at least one released milestone.
- Code verified (optional): repo/commit consistency checks, potentially AI-assisted.

Ranking evolution (pending):
- Feed completion rate, on-time delivery, and average rating into developer ranking.
- Move ranking from profile-only relevance to outcomes-based relevance.

### 4) Quality Control (Anti-Spam Layer)

Lightweight controls using existing infrastructure:
- Extend rate limits for new-account project creation and outbound messaging.
- Reduce ranking weight for projects missing usable demo/repo signals.
- Add admin flagged queue for moderation triggers instead of manual browsing.

### 5) Niching Strategy (Go-To-Market Wedge)

Recommendation:
- Focus first 90 days on one narrow wedge, then expand.

Candidate wedges:
1. Stack-specific supply focus (for example: Next.js/React MVP builders).
2. Client-type focus (for example: early-stage startup MVPs).
3. Project-type focus (for example: MVP shipped in 4 weeks).

Why this matters:
- Lower cold-start complexity.
- Sharper positioning against broad marketplaces.
- Better conversion from discovery pages and SEO surfaces (`/developers`, `/projects`).

### 6) Monetization Model (Decision Required)

Primary recommendation:
- Take rate on released milestones as the core model.

Secondary options (optional later):
- Client subscription for premium discovery/messaging limits.
- Boosted listings, clearly separated from trust-critical ranking logic.

### 7) Prioritized Execution Sequence (Next 90 Days)

Critical path:
1. Milestone schema + Stripe Connect onboarding.
2. Single-milestone fund -> submit -> release flow.
3. Review creation gated to released milestones.
4. Ranking weights updated for completion/review outcomes.
5. Decide and implement milestone take-rate model.

Parallel tracks:
1. Anti-spam throttles + flagged moderation queue.
2. Niche GTM focus + landing/discovery content.
3. AI UX integration on existing endpoints.

After critical path starts producing outcome data:
1. KPI wiring and analytics hardening.
2. Trust/verification UI polish.
3. Product consistency pass across role journeys.

## Local Development

## Prerequisites
- Node.js 20+
- npm 10+
- Docker (recommended for local dependencies)
- PostgreSQL connection for Prisma

## Backend
From `backend/`:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Useful commands:

```bash
npm run build
npm test
npm run lint
```

## Frontend
From `frontend/`:

```bash
npm install
npm run dev
```

## Deployment Notes
- Backend deployment blueprint is configured in `render.yaml`
- Backend deployment guide: `docs/RENDER_BACKEND_DEPLOY.md`
- Frontend deployment guide: `docs/VERCEL_FRONTEND_DEPLOY.md`

## Key Documentation
- Architecture: `docs/ARCHITECTURE.md`
- Product models and dashboard features: `docs/PRODUCT_MODELS_AND_DASHBOARD_FEATURES.md`
- Developer execution board and gap tracking: `docs/DEVELOPER_SIDE_EXECUTION_BOARD.md`
- Frontend route conventions: `docs/FRONTEND_ROUTE_MAP.md`
- Branching strategy: `docs/BRANCHING_STRATEGY.md`
- Roadmap execution plan: `docs/ROADMAP_EXECUTION_PLAN.md`
- Payments and escrow API spec: `docs/API_PAYMENTS_SPEC.md`
- Prisma milestones schema plan: `docs/PRISMA_MILESTONES_SCHEMA.md`
- Feature coverage matrix: `docs/FEATURE_COVERAGE.md`
- Release readiness checklist: `docs/RELEASE_READINESS.md`
- Actionable sprint backlog: `docs/SPRINT_BACKLOG.json`
- GitHub issue generation pack: `docs/github-issues/README.md`

## Branching Workflow
- `main`: production
- `staging`: integration/pre-production
- feature branches: `feat/*`, `fix/*`, `chore/*`

Recommended flow:
1. Branch from `staging`
2. Open PR to `staging` with passing checks
3. Validate in staging
4. Merge `staging` to `main` for release

---

