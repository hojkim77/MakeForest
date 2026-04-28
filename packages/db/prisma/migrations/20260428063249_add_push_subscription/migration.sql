-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "dongCode" TEXT,
    "todosPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dongCode" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL,
    "todos" JSONB NOT NULL DEFAULT '[]',
    "status" "SessionStatus" NOT NULL DEFAULT 'RUNNING',

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fossil" (
    "id" TEXT NOT NULL,
    "dongCode" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "creatureType" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "fossilX" INTEGER NOT NULL,
    "fossilY" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fossil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dong" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sigunguCode" TEXT NOT NULL,
    "sidoCode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Dong_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Creature" (
    "id" TEXT NOT NULL,
    "dongCode" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "waterCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WateringLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dongCode" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WateringLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "elapsedSec" INTEGER NOT NULL DEFAULT 0,
    "waterCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_dongCode_idx" ON "User"("dongCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");

-- CreateIndex
CREATE INDEX "FocusSession_userId_idx" ON "FocusSession"("userId");

-- CreateIndex
CREATE INDEX "FocusSession_dongCode_idx" ON "FocusSession"("dongCode");

-- CreateIndex
CREATE INDEX "FocusSession_status_idx" ON "FocusSession"("status");

-- CreateIndex
CREATE INDEX "Fossil_dongCode_idx" ON "Fossil"("dongCode");

-- CreateIndex
CREATE UNIQUE INDEX "Fossil_dongCode_date_key" ON "Fossil"("dongCode", "date");

-- CreateIndex
CREATE INDEX "Dong_sigunguCode_idx" ON "Dong"("sigunguCode");

-- CreateIndex
CREATE INDEX "Dong_sidoCode_idx" ON "Dong"("sidoCode");

-- CreateIndex
CREATE INDEX "Creature_dongCode_idx" ON "Creature"("dongCode");

-- CreateIndex
CREATE UNIQUE INDEX "Creature_dongCode_date_key" ON "Creature"("dongCode", "date");

-- CreateIndex
CREATE INDEX "WateringLog_userId_date_idx" ON "WateringLog"("userId", "date");

-- CreateIndex
CREATE INDEX "WateringLog_dongCode_date_idx" ON "WateringLog"("dongCode", "date");

-- CreateIndex
CREATE INDEX "DailySession_userId_idx" ON "DailySession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySession_userId_date_key" ON "DailySession"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WateringLog" ADD CONSTRAINT "WateringLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySession" ADD CONSTRAINT "DailySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
