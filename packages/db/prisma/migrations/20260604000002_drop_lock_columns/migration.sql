-- Migration: drop_lock_columns
-- Drops goalLockedAt and configLockedAt from FocusSession.
-- Lock is now derived from sessionStatus !== 'NONE' (single source of truth).
-- Idempotent: IF EXISTS guards prevent failure on re-run.

ALTER TABLE "FocusSession"
  DROP COLUMN IF EXISTS "goalLockedAt",
  DROP COLUMN IF EXISTS "configLockedAt";
