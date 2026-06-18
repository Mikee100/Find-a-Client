# Client Marketplace Flow

This document describes the client-facing marketplace work added to the Next.js frontend.

## Scope

The implementation upgrades the client journey without changing the backend contract or rewriting the app. It keeps the existing App Router structure, auth storage, API request helpers, and shared dashboard navbar.

Primary routes:
- `/login`
- `/register`
- `/client/dashboard`
- `/client/discover`
- `/client/discover/[slug]`

## Auth UI

### Login

File: `frontend/src/app/(auth)/login/page.tsx`

The login page was restyled into a cleaner marketplace entry screen. The existing auth behavior is unchanged:
- Submits through `login` from `frontend/src/lib/api.ts`.
- Stores tokens through existing `api.ts` and `auth.ts` logic.
- Reads the role from the access token with `getRoleFromAccessToken`.
- Redirects by role:
  - `ADMIN` -> `/admin/dashboard`
  - `CLIENT` -> `/client/dashboard`
  - default -> `/developer/dashboard`

### Register

File: `frontend/src/app/(auth)/register/page.tsx`

The register page was restyled and aligned with the confirmed backend payload.

The form sends only:
- `email`
- `password`
- `fullName`
- `username`

The previous role select was removed because `RegisterPayload` and the backend `RegisterDto` do not support role assignment during registration. The page still redirects to `/developer/dashboard` after registration because new users currently default to developer accounts in the backend.

## Client Dashboard

File: `frontend/src/app/(client)/client/dashboard/page.tsx`

The client dashboard is now a workspace rather than a scaffold page.

It includes:
- Welcome header.
- CTA to search developers and projects.
- Saved projects section using `getSavedProjects`.
- Recent message preview using `getMessageThreads`.
- Hiring request tracker placeholder.
- Recommended starting points.
- Empty states when saved projects or message threads are missing.

Authentication behavior:
- Reads tokens with `readTokens`.
- Redirects unauthenticated users to `/login`.
- Uses `logout` from `api.ts` for sign out.
- Reuses `DashboardNavbar`.

## Discovery Page

File: `frontend/src/app/(client)/client/discover/page.tsx`

The discovery page lets clients browse published project records as marketplace cards.

It includes:
- Search input.
- Category filter.
- Skill/tech filter.
- Availability filter UI.
- Budget filter.
- Pricing type filter.
- Developer/project cards.
- Tech stack badges.
- Pricing display.
- CTAs:
  - View Profile
  - Message
  - Send Hire Request

Backend wiring:
- General listing uses `listProjects`.
- Skill search uses `searchProjects`.
- Availability is currently UI-only because the backend project/user schema does not expose an availability field.

## Detail Page

File: `frontend/src/app/(client)/client/discover/[slug]/page.tsx`

The detail page shows a developer/project profile from a published project.

It includes:
- Project title and category.
- Developer name when included by the backend.
- Bio or project summary.
- Skills and tech stack.
- Project/demo information.
- Public links where available:
  - Demo
  - Website
  - GitHub
  - LinkedIn
- CTAs:
  - Message Developer
  - Send Hire Request

Backend wiring:
- Project detail uses `getProject(slug)`.
- The page relies on the backend project detail response, including `author` and `media` when available.

## Contact Modal

File: `frontend/src/features/client/contact-modal.tsx`

The modal is shared by discovery and detail CTAs.

Fields:
- Project title.
- Brief description.
- Budget range.
- Timeline.
- Message to developer.

Message behavior:
- Uses `createMessageThread` when the user submits a message.
- Sends `recipientId`, `projectId`, and `initialMessage` to the confirmed `POST /messages/threads` endpoint.

Hire request behavior:
- Shows a clear placeholder notice.
- Does not call the backend.
- Does not fake backend success.

Reason: no hire request endpoint exists in the current backend.

## API Helpers

File: `frontend/src/lib/api.ts`

The following helpers were added only for confirmed backend endpoints:
- `listProjects`
- `searchProjects`
- `getProject`
- `getPublicProfile`
- `createMessageThread`

Types added:
- `ProjectSummary`
- `ProjectDetail`
- `PublicProfile`
- `CreateThreadPayload`
- `CreatedThread`
- `ListProjectsParams`

No hardcoded backend URLs were added to components. All requests still flow through `api.ts`, which owns the base URL.

## Shared Layout

File: `frontend/src/features/shared/dashboard-navbar.tsx`

The existing dashboard navbar was kept and made more responsive so it works better on smaller screens with the new client pages.

## Backend Gaps

The UI intentionally avoids inventing backend data or fake success states.

Known gaps:
- No hire request endpoint.
- No developer availability field exposed for discovery filtering.
- No dedicated saved developer endpoint.
- Registration does not support selecting a role.

The current implementation uses existing project, saved project, auth, and messaging APIs where available.

## Verification

Frontend build was run from `frontend`:

```bash
npm run build
```

The build completed successfully.
