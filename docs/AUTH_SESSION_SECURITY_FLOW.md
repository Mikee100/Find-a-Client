# Auth, Session, and Security Flow

This document explains how authentication currently works in Find a Client after the security hardening updates.

## Goals

- Avoid token storage in browser localStorage.
- Use secure, HttpOnly cookie-based sessions.
- Automatically refresh access tokens without user interaction.
- Protect cookie-authenticated write endpoints from CSRF.
- Persist refresh sessions in the database so sessions survive server restarts.
- Record auth audit events for security visibility.

## High-level architecture

- Frontend sends auth and API requests with `credentials: "include"`.
- Backend authenticates users and sets cookies for session state.
- Backend verifies access token from cookie for protected routes.
- Frontend retries once after a 401 by calling `/auth/refresh` automatically.
- Backend rotates tokens and updates the refresh session record.

## Cookie model

On successful register/login/refresh, backend sets:

- `access_token` (HttpOnly): short-lived JWT used for API authorization.
- `refresh_token` (HttpOnly): long-lived JWT used only to rotate session.
- `csrf_token` (non-HttpOnly): random token used for CSRF double-submit checks.

Cookie behavior is configured by environment variables:

- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_SAME_SITE`
- `AUTH_COOKIE_DOMAIN`
- `AUTH_ACCESS_COOKIE_NAME`
- `AUTH_REFRESH_COOKIE_NAME`
- `AUTH_CSRF_COOKIE_NAME`

## Sign-in flow (step-by-step)

1. User submits login form in frontend.
2. Frontend calls `POST /auth/login` with email/password.
3. Backend validates credentials via Supabase auth and local user profile.
4. Backend issues access and refresh JWT tokens.
5. Backend persists refresh session in DB (`RefreshSession`).
6. Backend sets auth cookies and returns role metadata.
7. Frontend routes user to role dashboard.

## Protected API flow

1. Frontend calls protected endpoints with `credentials: "include"`.
2. Backend extracts access token from cookie (`JwtStrategy`).
3. `JwtAuthGuard` validates auth and applies CSRF checks for mutating methods.
4. Route handler executes if checks pass.

## Automatic token refresh

When a protected request returns `401`:

1. Frontend automatically calls `POST /auth/refresh`.
2. Backend verifies refresh token and `RefreshSession` DB record.
3. Backend rotates and reissues cookies.
4. Frontend retries original request one time.

This refresh is transparent to users and replaces the old manual refresh button flow.

## Logout flow

1. Frontend calls `POST /auth/logout`.
2. Backend revokes refresh session in DB.
3. Backend clears access, refresh, and csrf cookies.

## CSRF protection

CSRF uses double-submit cookie pattern:

- Frontend reads `csrf_token` cookie.
- Frontend sends it in `x-csrf-token` for `POST`, `PUT`, and `DELETE` requests.
- Backend guard verifies header value equals CSRF cookie value.

If values do not match, request is rejected.

## Persistent refresh sessions

Refresh sessions are stored in `RefreshSession` with:

- `userId`
- `tokenHash` (hashed refresh token)
- `expiresAt`
- `revokedAt`

This makes refresh handling restart-safe and production-friendly.

## Auth audit logging

Auth events are stored in `AuthAuditLog` with useful context:

- event name (`login_success`, `login_failed`, `refresh_failed`, etc.)
- user id/email when available
- IP address
- user agent
- success/failure flag
- optional metadata JSON

Use this for monitoring, incident review, and abuse investigation.

## Rate limiting

Auth routes are throttled and auth-service checks also enforce endpoint-aware limits.

Examples:

- Register: tighter limit
- Login: tighter limit
- Refresh: higher but bounded limit
- Logout: bounded limit

This helps defend against brute-force and abuse spikes.

## Important deployment notes

1. In production, set `AUTH_COOKIE_SECURE=true`.
2. If frontend/backend are on different domains over HTTPS, use `AUTH_COOKIE_SAME_SITE=none` and secure cookies.
3. Ensure frontend sends `credentials: "include"` and backend CORS has `credentials: true` and explicit allowed origin.
4. Run DB migrations before deployment so auth tables exist.
5. Rotate JWT secrets through secure secret management.

## Troubleshooting quick guide

- 401 on protected endpoint:
  - Check access cookie exists and is not expired.
  - Check refresh endpoint behavior and cookie domain/samesite config.

- CSRF errors on POST/PUT/DELETE:
  - Confirm frontend sends `x-csrf-token` header.
  - Confirm CSRF cookie name matches env config.

- 500 during login/refresh after new deploy:
  - Run migrations to create auth hardening tables.

## Related files

Backend:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/jwt.strategy.ts`
- `backend/src/common/guards/jwt-auth.guard.ts`
- `backend/prisma/schema.prisma`

Frontend:

- `frontend/src/lib/api.ts`
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(developer)/developer/dashboard/page.tsx`

Config:

- `backend/.env.example`
- `frontend/.env.sample`
