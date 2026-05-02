-- v1.7 — Projects + Tasks koppeling op werkaanvragen
--
-- Dit script:
--   1. Voegt `project_id` (nullable FK) toe aan `work_requests` zodat veel
--      werkaanvragen onder één project kunnen vallen. De bestaande
--      `projects.work_request_id` (1-1, "originele aanvraag waaruit project
--      ontstond") blijft naast deze nieuwe relatie staan.
--   2. Voegt `deadline` toe aan `projects` (planning-veld zoals werkaanvragen).
--   3. Voegt indexen toe.
--
-- Veilig idempotent. Niet-destructief.

ALTER TABLE "work_requests"
    ADD COLUMN IF NOT EXISTS "project_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_requests_project_id_fkey'
  ) THEN
    ALTER TABLE "work_requests"
      ADD CONSTRAINT "work_requests_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "work_requests_project_id_idx"
    ON "work_requests"("project_id");

ALTER TABLE "projects"
    ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "projects_manager_id_idx"
    ON "projects"("manager_id");
