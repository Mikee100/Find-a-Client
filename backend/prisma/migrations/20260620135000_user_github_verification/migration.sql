-- AlterTable
ALTER TABLE "User"
ADD COLUMN "githubUsername" VARCHAR(120),
ADD COLUMN "githubVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_user_github_verified_at"
ON "User" ("githubVerifiedAt");
