# Developer Side Execution Board

This board maps the current codebase to the desired developer-side product vision.

Status legend:
- [x] Implemented
- [~] Partially implemented
- [ ] Not implemented

Last updated: 2026-06-17

## 0) Current Gap Summary

Top missing pieces to become product-ready:
1. Structured developer profile fields are now modeled, but discovery/ranking and profile completeness APIs are not implemented yet.
2. Project showcase data model still misses role-in-project, repo URL, inquiry counter, and quality-scoring inputs.
3. Discovery is project search only; there is no developer ranking engine and no client filters for experience and availability.
4. Messaging exists, but no dedicated project offer / hire request workflow and no developer messages page route.
5. Dashboard shows many static placeholders; profile-strength meter and analytics are not driven by computed backend metrics.
6. AI matching layer is UI placeholder only; no backend recommendation endpoint.
7. Monetization and trust verification are only baseline (featured project boolean, isVerified flag) and need full workflows.

## 1) Capability Matrix (Vision vs Current)

### 1.1 Developer Profile (Core Entity)
- [x] Identity basics in User model: name, username, avatar, location, bio
- [x] title field (e.g. Full-stack Developer)
- [ ] dedicated public slug strategy for profile URLs (username exists but no explicit profile slug policy)
- [~] Skills graph: skills array exists, but no normalized Skill entity
- [x] primary stack
- [x] experience level enum (junior/mid/senior)
- [x] availability status enum (available/busy/not accepting)
- [x] social links (GitHub, LinkedIn, website)
- [x] optional public email toggle

### 1.2 Project Showcase (Core Differentiator)
- [x] project title, short/long description
- [x] tech stack, images/screenshots/video, demo URL
- [ ] role in project
- [ ] GitHub repo link per project
- [x] tags/categories baseline (Tag + ProjectTag + category)
- [x] likes and views counters
- [x] client inquiries counter per project
- [ ] project quality scoring model

### 1.3 Discovery and Ranking
- [x] basic search endpoint with text/category/tech filters
- [x] developer ranking algorithm service
- [~] ranking inputs: skill match, activity level, response time, profile completeness, engagement weighting
- [ ] client filter set: experience level, availability, location + project type as first-class filter API
- [x] dedicated public developer discovery endpoint with ranking output

### 1.4 Communication and Hiring Core
- [x] thread and message entities with project linkage
- [x] message read/unread state and thread listing
- [ ] developer inbox page route and full chat UI workflow
- [ ] chat attachments/files support in message model
- [ ] lightweight proposal mode in thread flow
- [ ] hire request entity and offer workflow (ask question vs offer project)

### 1.5 Developer Dashboard
- [x] dashboard route and base sections exist
- [~] overview cards wired to real metrics (partial: threads/saved/projects; many placeholders still static)
- [ ] profile strength meter computed from backend completeness rules
- [ ] missing-fields guidance API (what to do next)
- [ ] analytics endpoints for profile views, project engagement, response time trends

### 1.6 AI Matching Layer
- [ ] AI recommendation endpoint (developer <-> client/project matching)
- [ ] AI feedback loop: suggested profile/project improvements
- [~] UI placeholders exist on dashboard, but not data-backed

### 1.7 Monetization (Future-ready)
- [~] project feature flag exists (isFeatured)
- [ ] featured developer boost model
- [ ] promoted projects workflow
- [ ] premium badge/subscription tier

### 1.8 Trust and Verification
- [x] auth session hardening baseline and isVerified field
- [~] email verification pattern exists upstream, but no explicit in-app verification status UX
- [ ] GitHub account verification flow
- [ ] optional ID verification workflow
- [ ] verified badge rules and display logic

## 2) Data Model Tasks (Backend First)

### Phase A: Core profile and hiring schema
- [~] Add enums: ExperienceLevel, AvailabilityStatus, InquiryType, HireRequestStatus
- [x] Add User fields: title, primaryStack, experienceLevel, availabilityStatus, publicEmailEnabled
- [ ] Add Skill model and UserSkill join table (or keep tags + derived skill graph service)
- [ ] Add Project fields: roleInProject, repositoryUrl, inquiryCount, qualityScore
- [ ] Add ProjectView model (viewer, source, timestamp)
- [ ] Add HireRequest model (clientId, developerId, projectId?, brief, budget, timeline, status)
- [ ] Add MessageAttachment model and relation to Message

Acceptance check:
- [~] Prisma migrate succeeds in all environments
- [ ] Existing flows remain backward compatible

### Phase B: Metrics and ranking schema
- [ ] Add DeveloperMetric aggregate table (views, clicks, messagesReceived, avgResponseMinutes, hireRate)
- [ ] Add ProfileCompleteness snapshot table or computed view strategy
- [ ] Add RankingSnapshot table for explainable ranking outputs

Acceptance check:
- [ ] Nightly/triggered aggregation jobs defined
- [ ] Metrics reproducible from source events

## 3) API Tasks

### Profile and project APIs
- [x] Expand update profile DTO/API for title, stack, level, availability, public email toggle
- [ ] Add endpoint: GET /developers/:slug/public (rank-ready shape)
- [x] Add endpoint: GET /users/me/completeness
- [x] Add endpoint: POST /projects/:slug/inquiry (track inquiry signal)

### Discovery and ranking APIs
- [x] Add endpoint: GET /users/developers/search with full filter support
- [x] Add ranking service returning score + reason breakdown
- [ ] Add endpoint: GET /developers/recommended-for-client/:clientId

### Chat and hiring APIs
- [ ] Add endpoint: POST /hire-requests (offer project)
- [ ] Add endpoint: PATCH /hire-requests/:id/status
- [ ] Add message attachment upload and retrieval endpoints
- [ ] Add quick-reply templates endpoint for developers

### AI APIs
- [ ] Add endpoint: POST /ai/match/developer-opportunities
- [ ] Add endpoint: POST /ai/match/profile-improvements
- [ ] Add endpoint: POST /ai/match/client-to-developers

## 4) Frontend Tasks

### Developer workspace
- [ ] Build /developer/messages page (full inbox + thread panel + project context)
- [ ] Build /developer/projects page (manage list, drafts, publish/archive)
- [ ] Fix /developer/projects/new redirect target to developer flow if currently pointing to client flow
- [ ] Connect dashboard analytics cards to real API metrics
- [x] Implement profile strength meter from backend completeness endpoint

### Public discovery
- [x] Build /developers listing page with ranking and advanced filters
- [x] Build /developers/:username public profile page with project showcase first
- [x] Add Contact flow with two entry points: Ask question / Offer project

### AI UX
- [ ] Replace AI placeholder cards with live recommendations
- [ ] Show actionable guidance: add screenshot, add tags, improve response time, etc.

## 5) Product-Ready 5 Win Conditions

Track these as release blockers:
- [ ] Strong project showcase system (media-rich, role-in-project, repo/demo links, inquiry signals)
- [ ] Discovery algorithm (ranked developer discovery with explainable scoring)
- [ ] Project-tied chat (thread context + offer workflow + proposal mode)
- [ ] Profile strength scoring (live completion meter + missing-fields CTA)
- [ ] AI matching layer (recommendations + optimization suggestions)

## 6) Suggested Delivery Plan

### Sprint 1 (Foundation)
- [x] Ship schema migration for profile/ranking/hiring fields
- [x] Wire developer settings form to new fields
- [x] Add completeness calculation endpoint

### Sprint 2 (Discovery + Showcase)
- [x] Build ranked developer search API
- [x] Add public developers listing and profile pages
- [x] Add project inquiry tracking

### Sprint 3 (Hiring flow)
- [ ] Build hire request APIs and UI
- [ ] Build dedicated developer messages page with project context
- [ ] Add proposal mode and quick replies

### Sprint 4 (AI + polish)
- [ ] Integrate AI matching endpoints
- [ ] Surface ranking boost suggestions in dashboard
- [ ] Launch product-ready QA pass and KPI instrumentation

## 7) Weekly Checkpoint Template

Use this every week to track progress quickly:

- Week of: ________
- Done this week:
  - [ ]
  - [ ]
- In progress:
  - [ ]
  - [ ]
- Blockers:
  - [ ]
- Metrics movement:
  - Profile completeness avg: ____%
  - Developer response time: ____ min
  - Inquiry to hire conversion: ____%
- Next week top 3:
  1. 
  2. 
  3. 

## 8) Security Note (Immediate)

Your shared .env snippet includes live-looking secrets (database, service role, Cloudinary). Treat them as exposed and rotate them before further development/testing.
