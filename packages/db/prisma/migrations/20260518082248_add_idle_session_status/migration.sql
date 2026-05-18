-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'IDLE';

-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN     "regionCode" TEXT;

-- CreateIndex
CREATE INDEX "CommunityPost_regionCode_idx" ON "CommunityPost"("regionCode");
