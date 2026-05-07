-- Drop old Creature table (replaced by permanent per-user UserCreature)
DROP TABLE IF EXISTS "Creature";

-- CreateTable UserCreature
CREATE TABLE "UserCreature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "waterCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCreature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCreature_userId_key" ON "UserCreature"("userId");

-- AddForeignKey
ALTER TABLE "UserCreature" ADD CONSTRAINT "UserCreature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add userId to Fossil (empty table in CI fresh DB; use DEFAULT '' then drop to satisfy NOT NULL)
ALTER TABLE "Fossil" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Fossil" ALTER COLUMN "userId" DROP DEFAULT;

-- Swap unique constraint: dongCode+date → userId+date
DROP INDEX "Fossil_dongCode_date_key";
CREATE UNIQUE INDEX "Fossil_userId_date_key" ON "Fossil"("userId", "date");

-- CreateIndex for Fossil.userId
CREATE INDEX "Fossil_userId_idx" ON "Fossil"("userId");

-- AddForeignKey Fossil → User
ALTER TABLE "Fossil" ADD CONSTRAINT "Fossil_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
