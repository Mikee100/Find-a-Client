-- Performance indexes for feed, search, messaging, notifications, and hiring flows.

-- Project feed and search indexes
CREATE INDEX IF NOT EXISTS "idx_project_published_recent"
ON "Project" ("createdAt" DESC)
WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_project_published_popular"
ON "Project" ("likeCount" DESC)
WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_project_published_viewed"
ON "Project" ("viewCount" DESC)
WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_project_techstack_gin"
ON "Project" USING GIN ("techStack");

CREATE INDEX IF NOT EXISTS "idx_project_industries_gin"
ON "Project" USING GIN ("industries");

-- Thread and message indexes
CREATE INDEX IF NOT EXISTS "idx_thread_participant_a_updated_desc"
ON "Thread" ("participantAId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_thread_participant_b_updated_desc"
ON "Thread" ("participantBId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_thread_pair_updated_desc"
ON "Thread" ("participantAId", "participantBId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_message_thread_unread_created_desc"
ON "Message" ("threadId", "createdAt" DESC)
WHERE "isRead" = false;

-- Notification indexes
CREATE INDEX IF NOT EXISTS "idx_notification_user_read_created_desc"
ON "Notification" ("userId", "isRead", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_notification_user_type_read"
ON "Notification" ("userId", "type", "isRead");

-- Hire request list indexes
CREATE INDEX IF NOT EXISTS "idx_hirerequest_client_status_created_desc"
ON "HireRequest" ("clientId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_hirerequest_developer_status_created_desc"
ON "HireRequest" ("developerId", "status", "createdAt" DESC);

-- Saved and liked timeline indexes
CREATE INDEX IF NOT EXISTS "idx_saved_user_created_desc"
ON "Saved" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_projectlike_user_created_desc"
ON "ProjectLike" ("userId", "createdAt" DESC);

-- Developer discovery base index
CREATE INDEX IF NOT EXISTS "idx_user_role_experience_availability"
ON "User" ("role", "experienceLevel", "availabilityStatus");
