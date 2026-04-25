-- HandyMan v1.5 — add tijdsregistratie aan werkaanvragen
--
-- Run this ONCE in the Supabase SQL editor (or via psql on DIRECT_URL).
-- Safe to re-run: the IF NOT EXISTS guards make it idempotent.

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_request_id UUID NOT NULL REFERENCES work_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS time_entries_work_request_id_idx
  ON time_entries(work_request_id);

CREATE INDEX IF NOT EXISTS time_entries_user_id_idx
  ON time_entries(user_id);

-- Enforce that ended_at >= started_at and duration is non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entries_valid_range'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT time_entries_valid_range
      CHECK (ended_at IS NULL OR ended_at >= started_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entries_duration_non_negative'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT time_entries_duration_non_negative
      CHECK (duration_minutes IS NULL OR duration_minutes >= 0);
  END IF;
END $$;
