ALTER TABLE "DailyCollection" RENAME TO "DailyMission";
ALTER INDEX "DailyCollection_pkey" RENAME TO "DailyMission_pkey";
ALTER INDEX "DailyCollection_regionCode_date_key" RENAME TO "DailyMission_regionCode_date_key";
ALTER INDEX "DailyCollection_regionCode_date_idx" RENAME TO "DailyMission_regionCode_date_idx";
