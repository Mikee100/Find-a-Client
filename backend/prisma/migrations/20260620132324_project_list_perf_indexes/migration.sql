-- DropIndex
DROP INDEX "idx_hirerequest_client_status_created_desc";

-- DropIndex
DROP INDEX "idx_hirerequest_developer_status_created_desc";

-- DropIndex
DROP INDEX "idx_notification_user_read_created_desc";

-- DropIndex
DROP INDEX "idx_notification_user_type_read";

-- DropIndex
DROP INDEX "idx_project_industries_gin";

-- DropIndex
DROP INDEX "idx_project_quality_score_desc";

-- DropIndex
DROP INDEX "idx_project_techstack_gin";

-- DropIndex
DROP INDEX "idx_projectlike_user_created_desc";

-- DropIndex
DROP INDEX "idx_saved_user_created_desc";

-- DropIndex
DROP INDEX "idx_thread_pair_updated_desc";

-- DropIndex
DROP INDEX "idx_thread_participant_a_updated_desc";

-- DropIndex
DROP INDEX "idx_thread_participant_b_updated_desc";

-- DropIndex
DROP INDEX "idx_user_github_verified_at";

-- DropIndex
DROP INDEX "idx_user_role_experience_availability";

-- CreateIndex
CREATE INDEX "Project_status_deletedAt_createdAt_idx" ON "Project"("status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Project_status_deletedAt_likeCount_idx" ON "Project"("status", "deletedAt", "likeCount");

-- CreateIndex
CREATE INDEX "Project_status_deletedAt_viewCount_idx" ON "Project"("status", "deletedAt", "viewCount");

-- CreateIndex
CREATE INDEX "Project_status_deletedAt_price_idx" ON "Project"("status", "deletedAt", "price");

-- CreateIndex
CREATE INDEX "Project_status_deletedAt_category_pricingType_idx" ON "Project"("status", "deletedAt", "category", "pricingType");
