# DevShowcase Backend

Production-grade NestJS backend for DevShowcase, a marketplace where developers publish projects and clients engage via Q&A, DMs, and hiring workflows.

## Stack

- Runtime: Node.js 20+
- Framework: NestJS + TypeScript strict mode
- ORM/DB: Prisma + PostgreSQL
- Auth: Supabase Auth + JWT
- Realtime: Supabase Realtime channels
- Media: Cloudinary
- Queue: BullMQ + Redis
- Email: Resend
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
	queue/
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
- `REDIS_URL`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `FRONTEND_URL`

## Local Development

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
- Auth: register, login, refresh, logout, Google/GitHub redirect helpers
- Users: profile read/update, avatar upload, saved projects
- Projects: create/list/detail/update/archive, like/save, question endpoints
- Media: upload/delete via Cloudinary, video processing queue hook
- Messages: thread creation, list, paginated messages, send, read
- Reviews: create/list + queue hook for recalculation
- Notifications: list/read-all/dispatch + email dispatch for high-priority types
- Search: query endpoint with category/tech filtering
- Admin: moderation queue and featured toggle

The codebase is designed for iterative hardening on top of this baseline.
