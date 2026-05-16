-- CreateTable
CREATE TABLE "DailyCollection" (
    "id" TEXT NOT NULL,
    "dongCode" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "creatureType" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCollection_dongCode_date_idx" ON "DailyCollection"("dongCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCollection_dongCode_date_key" ON "DailyCollection"("dongCode", "date");
