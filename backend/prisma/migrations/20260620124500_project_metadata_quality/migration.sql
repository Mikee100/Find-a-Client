-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "roleInProject" VARCHAR(120),
ADD COLUMN "repositoryUrl" TEXT,
ADD COLUMN "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Optional sort helper for future ranked feeds
CREATE INDEX IF NOT EXISTS "idx_project_quality_score_desc"
ON "Project" ("qualityScore" DESC);
