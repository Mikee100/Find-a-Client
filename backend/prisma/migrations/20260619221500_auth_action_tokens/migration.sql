-- CreateEnum
CREATE TYPE "AuthActionTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "AuthActionToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenType" "AuthActionTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthActionToken_tokenHash_key" ON "AuthActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthActionToken_userId_tokenType_createdAt_idx" ON "AuthActionToken"("userId", "tokenType", "createdAt");

-- CreateIndex
CREATE INDEX "AuthActionToken_tokenType_expiresAt_idx" ON "AuthActionToken"("tokenType", "expiresAt");

-- AddForeignKey
ALTER TABLE "AuthActionToken" ADD CONSTRAINT "AuthActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
