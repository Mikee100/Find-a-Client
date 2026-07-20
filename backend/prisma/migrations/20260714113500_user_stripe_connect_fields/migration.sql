-- AlterTable
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "stripeAccountId" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeAccountId_key"
ON "User" ("stripeAccountId");
