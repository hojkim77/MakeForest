-- Migration 1: session_customization_schema
-- Adds per-day timer config + goal fields, lastTimerConfig on User, totalFocusMinutes on UserCreature.
-- Drops MapUser.todosPublic (no consumer after lockstep FE/BE deploy).
-- All column additions use IF NOT EXISTS — idempotent.

-- 1. User: last-used timer config for next-day prefill
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lastFocusLengthMin" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastSegmentCount"   INTEGER;

-- 2. FocusSession: per-day timer config + goal + lock timestamps
ALTER TABLE "FocusSession"
  ADD COLUMN IF NOT EXISTS "focusLengthMin"  INTEGER,
  ADD COLUMN IF NOT EXISTS "segmentCount"    INTEGER,
  ADD COLUMN IF NOT EXISTS "configLockedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "todayGoal"       TEXT,
  ADD COLUMN IF NOT EXISTS "goalLockedAt"    TIMESTAMP(3);

-- 3. UserCreature: canonical growth unit (default 0 — backfill in next migration)
ALTER TABLE "UserCreature"
  ADD COLUMN IF NOT EXISTS "totalFocusMinutes" INTEGER NOT NULL DEFAULT 0;

-- 4. CHECK constraints (apply only when columns are non-null — legacy NULL rows pass)
ALTER TABLE "FocusSession"
  ADD CONSTRAINT focus_length_range
    CHECK ("focusLengthMin" IS NULL OR ("focusLengthMin" BETWEEN 5 AND 120 AND "focusLengthMin" % 5 = 0)),
  ADD CONSTRAINT segment_count_positive
    CHECK ("segmentCount" IS NULL OR "segmentCount" >= 1),
  ADD CONSTRAINT focus_total_daily_cap
    CHECK ("focusLengthMin" IS NULL OR "segmentCount" IS NULL
           OR "focusLengthMin" * "segmentCount" <= 1440),
  ADD CONSTRAINT today_goal_length
    CHECK ("todayGoal" IS NULL OR (CHAR_LENGTH(BTRIM("todayGoal")) BETWEEN 1 AND 50));
