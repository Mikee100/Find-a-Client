-- Add profile ranking enums
CREATE TYPE "ExperienceLevel" AS ENUM ('JUNIOR', 'MID', 'SENIOR');
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'NOT_ACCEPTING_WORK');

-- Extend user profile for developer discovery/ranking
ALTER TABLE "User"
ADD COLUMN "title" VARCHAR(120),
ADD COLUMN "primaryStack" VARCHAR(80),
ADD COLUMN "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'MID',
ADD COLUMN "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN "publicEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
