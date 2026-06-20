# DevShowcase Backend

Production-grade NestJS backend for DevShowcase, a marketplace where developers publish projects and clients engage via Q&A, DMs, and hiring workflows.

## Stack

- Runtime: Node.js 20+
- Framework: NestJS + TypeScript strict mode
- ORM/DB: Prisma + PostgreSQL
- Auth: Supabase Auth + JWT
- Realtime: Supabase Realtime channels
- Media: Cloudinary
- Email: SMTP (app password) or Resend
- Validation: class-validator + class-transformer
- Tests: Jest

## Folder Structure

```
src/
	common/
	config/
	modules/
		auth/
		users/
		projects/
		media/
		messages/
		questions/
		reviews/
		notifications/
		search/
		admin/
	prisma/
prisma/
	schema.prisma
	migrations/
```

## Environment

Copy `.env.example` to `.env` and fill all required values.

Critical variables:
- `DATABASE_URL`, `DIRECT_URL`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAME_SITE`, `AUTH_COOKIE_DOMAIN`
- `AUTH_ACCESS_COOKIE_NAME`, `AUTH_REFRESH_COOKIE_NAME`, `AUTH_CSRF_COOKIE_NAME`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `EMAIL_PROVIDER` (`smtp` or `resend`)
- `EMAIL_FROM`
- SMTP mode: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- Resend mode: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`
- `REDIS_URL` (optional, enables distributed auth rate limits)
- `AUTH_VERIFY_EMAIL_PATH`, `AUTH_RESET_PASSWORD_PATH`
- `FRONTEND_URL`
- `FRONTEND_URLS` (optional comma-separated origins, e.g. `https://find-a-client.vercel.app,https://preview.example.com`)

## Local Development

### Email Setup (SMTP App Password)

Set `EMAIL_PROVIDER="smtp"` and configure:
- `SMTP_HOST` (for Gmail: `smtp.gmail.com`)
- `SMTP_PORT` (`587` with STARTTLS, or `465` with SSL)
- `SMTP_SECURE` (`false` for 587, `true` for 465)
- `SMTP_USER` (your mailbox)
- `SMTP_PASS` (your app password)
- `EMAIL_FROM` (must be allowed by your provider)

For Gmail app passwords, your Google account must have 2-Step Verification enabled.

### Email Observability Webhook

If using Resend, configure webhook target:
- `POST /notifications/webhooks/resend`
- Header: `x-webhook-secret` must match `RESEND_WEBHOOK_SECRET` when set.

Delivery events are stored in `EmailDeliveryLog` and updated as webhook events arrive.

1. Start infrastructure:

```bash
docker compose up -d
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run migrations:

```bash
npm run prisma:migrate
```

5. Start API:

```bash
npm run start:dev
```

Health endpoint: `GET /health`

## Quality Commands

```bash
npm run build
npm test
```

## Deploy To Render

The backend is ready for Render deployment.

Quick setup:
- Root directory: `backend`
- Build command: `npm ci && npm run prisma:generate && npm run build && npm run prisma:deploy`
- Start command: `npm run start`
- Health check path: `/health`

For full steps and environment variables, see `../docs/RENDER_BACKEND_DEPLOY.md`.

## API Envelope

Success responses:

```json
{
	"success": true,
	"data": {}
}
```

Paginated responses:

```json
{
	"success": true,
	"data": [],
	"meta": {
		"hasNext": true,
		"nextCursor": "..."
	}
}
```

Error responses:

```json
{
	"success": false,
	"error": {
		"code": "UNAUTHORIZED",
		"message": "..."
	}
}
```

## Current Delivery Scope

Implemented modules and endpoints:
- Auth: register, login, refresh, logout, session endpoint, Google/GitHub redirect helpers
- Users: profile read/update, avatar upload, saved projects
- Projects: create/list/detail/update/archive, like/save, question endpoints
- Media: upload/delete via Cloudinary
- Messages: thread creation, list, paginated messages, send, read
- Reviews: create/list
- Notifications: list/read-all/dispatch + email dispatch for high-priority types
- Search: query endpoint with category/tech filtering
- Admin: moderation and featured toggle

The codebase is designed for iterative hardening on top of this baseline.

## Security Hardening Notes

- Access and refresh tokens are delivered in HttpOnly cookies (not localStorage).
- CSRF protection uses double-submit cookie checks (`x-csrf-token` must match CSRF cookie).
- Refresh sessions are persisted in PostgreSQL (`RefreshSession` model) and survive restarts.
- Auth audit events are persisted in PostgreSQL (`AuthAuditLog` model).
- Auth rate limiting is enforced per endpoint and request identity context.
