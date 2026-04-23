-- HandyMan v1.4 — add progress column to work_requests
--
-- Run this ONCE in the Supabase SQL editor (or via psql on DIRECT_URL).
-- Safe to re-run: the IF NOT EXISTS guard makes it idempotent.
--
-- After running, the /work-requests list and detail page will work again.

ALTER TABLE work_requests
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;

-- Optional: enforce the 0..100 range at the database level so bad
-- values can't sneak past the API validation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_requests_progress_range'
  ) THEN
    ALTER TABLE work_requests
      ADD CONSTRAINT work_requests_progress_range
      CHECK (progress BETWEEN 0 AND 100);
  END IF;
END $$;
