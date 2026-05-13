-- FocusSession 리팩터링: DailySession 통합, 하루 1개 세션 구조로 변경

-- 1. FocusSession에 새 컬럼 추가 (nullable로 먼저)
ALTER TABLE "FocusSession" ADD COLUMN "date" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "waterCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FocusSession" ADD COLUMN "totalElapsedSec" INTEGER NOT NULL DEFAULT 0;

-- 2. date를 startedAt 기준 KST 날짜로 채우기
UPDATE "FocusSession"
SET "date" = TO_CHAR("startedAt" AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD');

-- 3. waterCount를 DailySession에서 마이그레이션 (날짜+유저가 일치하는 경우)
UPDATE "FocusSession" fs
SET "waterCount" = COALESCE(ds."waterCount", 0),
    "totalElapsedSec" = COALESCE(ds."waterCount", 0) * 1800
FROM "DailySession" ds
WHERE fs."userId" = ds."userId"
  AND fs."date" = ds."date";

-- 4. userId+date 중복 제거 (같은 날 여러 세션 중 최신만 유지)
DELETE FROM "FocusSession"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY "userId", "date" ORDER BY "startedAt" DESC) AS rn
    FROM "FocusSession"
  ) ranked
  WHERE rn > 1
);

-- 5. date NOT NULL 적용
ALTER TABLE "FocusSession" ALTER COLUMN "date" SET NOT NULL;

-- 6. userId+date 유니크 제약 추가
CREATE UNIQUE INDEX "FocusSession_userId_date_key" ON "FocusSession"("userId", "date");

-- 7. date 인덱스 추가
CREATE INDEX "FocusSession_date_idx" ON "FocusSession"("date");

-- 8. 사용하지 않는 컬럼 제거
ALTER TABLE "FocusSession" DROP COLUMN "endedAt";
ALTER TABLE "FocusSession" DROP COLUMN "durationSec";

-- 9. DailySession 테이블 제거
DROP TABLE "DailySession";
