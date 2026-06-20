# Architecture Direction

## Product domains
- Identity and access: sign up/login, role (`developer`, `client`, `admin`)
- Developer portfolio: demos, project metadata, tech stack, links, media
- Discovery: search, filters, tags, sorting
- Messaging: client-to-developer direct messaging
- Hiring funnel: inquiry, proposal, status tracking

## Backend service boundaries (starting point)
- Auth Service
- Profile Service
- Project/Demo Service
- Messaging Service
- Hiring Service

You can keep this as a modular monolith first, then split later when scale requires it.

## Data model (initial)
- `users`
- `developer_profiles`
- `projects`
- `project_media`
- `conversations`
- `messages`
- `hire_requests`

## Security baseline
- JWT/OAuth for auth
- RBAC per role
- Rate limiting on auth and messaging endpoints
- Input validation on all write endpoints
- Audit logs for key hiring actions

## Performance docs
- Backend caching and indexing implementation: `docs/BACKEND_CACHING_AND_INDEXING.md`
