-- CreateTable
CREATE TABLE "UserGuideState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tourCompletedAt" TIMESTAMP(3),
    "lastDailyGuideShownDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGuideState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGuideState_userId_key" ON "UserGuideState"("userId");

-- AddForeignKey
ALTER TABLE "UserGuideState" ADD CONSTRAINT "UserGuideState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
