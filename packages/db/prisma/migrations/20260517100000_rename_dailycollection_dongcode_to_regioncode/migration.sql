-- Rename column dongCode to regionCode
ALTER TABLE "DailyCollection" RENAME COLUMN "dongCode" TO "regionCode";

-- Drop old indexes
DROP INDEX "DailyCollection_dongCode_date_key";
DROP INDEX "DailyCollection_dongCode_date_idx";

-- Create new indexes
CREATE UNIQUE INDEX "DailyCollection_regionCode_date_key" ON "DailyCollection"("regionCode", "date");
CREATE INDEX "DailyCollection_regionCode_date_idx" ON "DailyCollection"("regionCode", "date");
