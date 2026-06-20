# Backend Caching and Indexing

This document describes the performance work implemented for backend caching and database indexing.

## Scope Implemented

The following areas were implemented:
- Postgres indexes for high-traffic read/query paths.
- Application-level caching with Redis primary storage and in-memory fallback.
- Namespace-based cache invalidation on write operations.
- Cache metrics logging for hit/miss visibility.

## Database Indexing

Migration applied:
- `backend/prisma/migrations/20260620001000_performance_indexes/migration.sql`

### Indexes added

Project feed and search:
- `idx_project_published_recent` on `Project(createdAt DESC)` where `status='PUBLISHED'` and `deletedAt IS NULL`
- `idx_project_published_popular` on `Project(likeCount DESC)` where `status='PUBLISHED'` and `deletedAt IS NULL`
- `idx_project_published_viewed` on `Project(viewCount DESC)` where `status='PUBLISHED'` and `deletedAt IS NULL`
- `idx_project_techstack_gin` GIN index on `Project(techStack)`
- `idx_project_industries_gin` GIN index on `Project(industries)`

Messaging:
- `idx_thread_participant_a_updated_desc` on `Thread(participantAId, updatedAt DESC)`
- `idx_thread_participant_b_updated_desc` on `Thread(participantBId, updatedAt DESC)`
- `idx_thread_pair_updated_desc` on `Thread(participantAId, participantBId, updatedAt DESC)`
- `idx_message_thread_unread_created_desc` on `Message(threadId, createdAt DESC)` where `isRead=false`

Notifications:
- `idx_notification_user_read_created_desc` on `Notification(userId, isRead, createdAt DESC)`
- `idx_notification_user_type_read` on `Notification(userId, type, isRead)`

Hire requests:
- `idx_hirerequest_client_status_created_desc` on `HireRequest(clientId, status, createdAt DESC)`
- `idx_hirerequest_developer_status_created_desc` on `HireRequest(developerId, status, createdAt DESC)`

Saved and likes:
- `idx_saved_user_created_desc` on `Saved(userId, createdAt DESC)`
- `idx_projectlike_user_created_desc` on `ProjectLike(userId, createdAt DESC)`

Developer discovery:
- `idx_user_role_experience_availability` on `User(role, experienceLevel, availabilityStatus)`

## Caching Architecture

Core cache components:
- `backend/src/common/cache/cache.module.ts`
- `backend/src/common/cache/cache.service.ts`

Design:
- Redis is used when `REDIS_URL` is configured.
- If Redis is unavailable or not configured, in-memory Map cache is used.
- Cache keys are namespace-versioned (`<namespace>:v<version>:<raw>`).
- Invalidation is done by incrementing namespace version, avoiding key scans.

### Cache metrics

`CacheService` logs sampled metrics in `cache-stats` format:
- Reads
- Hit rate
- Hits
- Misses
- Sets
- Deletes
- Namespace invalidations

Metrics log frequency is controlled by `CACHE_METRICS_LOG_EVERY`.

## Cached Endpoints and TTLs

Projects:
- `ProjectsService.list()` cached in namespace `projects-list` with TTL 60s.

Search:
- `SearchService.search()` cached in namespace `projects-search` with TTL 60s.

Developer search:
- `UsersService.searchDevelopers()` cached in namespace `developers-search` with TTL 120s.

Threads:
- `MessagesService.listThreads()` cached per user namespace `threads-list:<userId>` with TTL 10s.

Notifications:
- `NotificationsService.list()` cached per user namespace `notifications-list:<userId>` with TTL 10s.

Hire requests:
- `HireRequestsService.list()` cached with:
  - admin namespace `hire-requests-admin`
  - user namespace `hire-requests-user:<userId>`
  - TTL 15s
- `HireRequestsService.getById()` cached with:
  - admin namespace `hire-request-by-id-admin`
  - user namespace `hire-request-by-id-user:<userId>`
  - TTL 15s

## Invalidation Rules Implemented

Projects and discovery:
- Invalidate `projects-list`, `projects-search`, `developers-search` after:
  - project create
  - project update
  - project archive
  - project like toggle
  - user profile update (`updateMe`)
  - user avatar update (`updateAvatar`)

Threads:
- Invalidate both participants' `threads-list:<userId>` namespace after:
  - thread create
  - message send
  - mark thread read

Notifications:
- Invalidate `notifications-list:<userId>` after:
  - notification dispatch
  - `readAll`
  - `readOne`

Hire requests:
- Invalidate list namespaces (`hire-requests-admin`, `hire-requests-user:<userId>`) after:
  - create
  - update status
  - submit proposal
- Invalidate by-id namespaces (`hire-request-by-id-admin`, `hire-request-by-id-user:<userId>`) after:
  - update status
  - submit proposal

## Configuration

Environment variables:
- `REDIS_URL` (optional): enables Redis-backed cache.
- `CACHE_METRICS_LOG_EVERY` (optional, default `200`): read-sample interval for cache metrics logs.

## Validation Performed

Commands used:

```bash
cd backend
npm run prisma:deploy
npm run build
npm run test
```

Status:
- Migration applied successfully.
- Build passed.
- Tests passed (10/10 suites).

## Notes

- Current caching is service-level and optimized for existing query patterns.
- Namespace-version invalidation keeps invalidation cheap and predictable.
- If traffic grows, next step is adding endpoint-level latency dashboards and cache hit-rate reporting endpoint for operations visibility.
