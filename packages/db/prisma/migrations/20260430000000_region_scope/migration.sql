-- User에 regionCode 추가
ALTER TABLE "User" ADD COLUMN "regionCode" TEXT;
CREATE INDEX "User_regionCode_idx" ON "User"("regionCode");

-- Creature: dongCode → regionCode
-- 1) 임시 컬럼 추가 후 앞 5자리로 초기화
ALTER TABLE "Creature" ADD COLUMN "regionCode" TEXT NOT NULL DEFAULT '';
UPDATE "Creature" SET "regionCode" = substring("dongCode", 1, 5);
ALTER TABLE "Creature" ALTER COLUMN "regionCode" DROP DEFAULT;

-- 2) 같은 (regionCode, date)가 여러 행일 경우 waterCount/stage를 최대값으로 대표 1행만 유지
DELETE FROM "Creature" c1
USING "Creature" c2
WHERE c1."regionCode" = c2."regionCode"
  AND c1."date" = c2."date"
  AND c1."id" > c2."id";

-- 3) 기존 컬럼/인덱스/유니크 제거
ALTER TABLE "Creature" DROP COLUMN "dongCode";
DROP INDEX IF EXISTS "Creature_dongCode_idx";
ALTER TABLE "Creature" DROP CONSTRAINT IF EXISTS "Creature_dongCode_date_key";

-- 4) 새 인덱스/유니크 생성
CREATE UNIQUE INDEX "Creature_regionCode_date_key" ON "Creature"("regionCode", "date");
CREATE INDEX "Creature_regionCode_idx" ON "Creature"("regionCode");
