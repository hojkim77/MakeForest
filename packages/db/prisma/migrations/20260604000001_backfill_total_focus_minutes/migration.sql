-- Migration 2: backfill_total_focus_minutes
-- Idempotent: only updates rows where totalFocusMinutes is still 0 AND there is legacy waterCount data.
-- Re-running picks up only the unprocessed rows (those already updated have totalFocusMinutes > 0).

UPDATE "UserCreature"
SET    "totalFocusMinutes" = "totalWaterCount" * 30
WHERE  "totalFocusMinutes" = 0
  AND  "totalWaterCount" > 0;

-- Defensive stage recompute using minute-based thresholds (× 30 vs legacy water-based).
-- For legacy 30-min users this produces identical stage values — lossless.
UPDATE "UserCreature"
SET    "stage" = (
  CASE
    WHEN "totalFocusMinutes" >= 32400 THEN 9
    WHEN "totalFocusMinutes" >= 22320 THEN 8
    WHEN "totalFocusMinutes" >= 15120 THEN 7
    WHEN "totalFocusMinutes" >= 10080 THEN 6
    WHEN "totalFocusMinutes" >=  6480 THEN 5
    WHEN "totalFocusMinutes" >=  3960 THEN 4
    WHEN "totalFocusMinutes" >=  2160 THEN 3
    WHEN "totalFocusMinutes" >=  1080 THEN 2
    WHEN "totalFocusMinutes" >=   360 THEN 1
    ELSE 0
  END
);
