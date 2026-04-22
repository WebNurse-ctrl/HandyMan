-- HandyMan v1.2 - volledig Supabase rebuild script
-- Drop alles + maak schema opnieuw conform frontend/prisma/schema.prisma
-- WAARSCHUWING: alle data gaat verloren. Enkel gebruiken op lege of
-- corrupte DBs. Uitvoeren via Supabase SQL Editor.
--
-- Gotcha: Prisma's `String @id @default(uuid())` is een TEXT kolom in
-- Postgres (niet UUID). Alle FKs naar users.id zijn dus ook TEXT.

-- =========================================================================
-- DROP ALLES
-- =========================================================================
DROP TABLE IF EXISTS audit_logs          CASCADE;
DROP TABLE IF EXISTS system_config       CASCADE;
DROP TABLE IF EXISTS notifications       CASCADE;
DROP TABLE IF EXISTS attachments         CASCADE;
DROP TABLE IF EXISTS comments            CASCADE;
DROP TABLE IF EXISTS purchase_approvals  CASCADE;
DROP TABLE IF EXISTS purchase_requests   CASCADE;
DROP TABLE IF EXISTS task_logs           CASCADE;
DROP TABLE IF EXISTS tasks               CASCADE;
DROP TABLE IF EXISTS projects            CASCADE;
DROP TABLE IF EXISTS work_requests       CASCADE;
DROP TABLE IF EXISTS request_bundles     CASCADE;
DROP TABLE IF EXISTS categories          CASCADE;
DROP TABLE IF EXISTS locations           CASCADE;
DROP TABLE IF EXISTS campuses            CASCADE;
DROP TABLE IF EXISTS users               CASCADE;

DROP TYPE IF EXISTS "NotificationType"   CASCADE;
DROP TYPE IF EXISTS "PurchaseType"       CASCADE;
DROP TYPE IF EXISTS "PurchaseStatus"     CASCADE;
DROP TYPE IF EXISTS "ProjectStatus"      CASCADE;
DROP TYPE IF EXISTS "TaskStatus"         CASCADE;
DROP TYPE IF EXISTS "Priority"           CASCADE;
DROP TYPE IF EXISTS "WorkRequestStatus"  CASCADE;
DROP TYPE IF EXISTS "UserStatus"         CASCADE;
DROP TYPE IF EXISTS "UserRole"           CASCADE;

-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE "UserRole" AS ENUM (
  'MEDEWERKER', 'TECHNISCHE_DIENST', 'DIENSTHOOFD', 'FACILITAIR_MANAGER', 'ADMIN'
);
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "WorkRequestStatus" AS ENUM (
  'INGEDIEND', 'IN_BEHANDELING', 'GOEDGEKEURD', 'AFGEWERKT', 'GEWEIGERD'
);
CREATE TYPE "Priority" AS ENUM ('LAAG', 'NORMAAL', 'HOOG', 'URGENT');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_UITVOERING', 'AFGEWERKT', 'ON_HOLD');
CREATE TYPE "ProjectStatus" AS ENUM (
  'PLANNING', 'ACTIEF', 'ON_HOLD', 'AFGEROND', 'GEANNULEERD'
);
CREATE TYPE "PurchaseStatus" AS ENUM (
  'AANGEVRAAGD', 'WACHT_OP_GOEDKEURING', 'GOEDGEKEURD_DIENSTHOOFD',
  'GOEDGEKEURD', 'AFGEWEZEN', 'BESTELD', 'GELEVERD'
);
CREATE TYPE "PurchaseType" AS ENUM ('KLEIN', 'GROOT');
CREATE TYPE "NotificationType" AS ENUM (
  'WORK_REQUEST_CREATED', 'WORK_REQUEST_STATUS_CHANGED',
  'TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_DEADLINE_APPROACHING',
  'PURCHASE_APPROVAL_NEEDED', 'PURCHASE_APPROVED', 'PURCHASE_REJECTED',
  'PROJECT_BUDGET_ALERT', 'COMMENT_ADDED',
  'USER_APPROVAL_NEEDED', 'USER_APPROVED'
);

-- =========================================================================
-- users
-- =========================================================================
CREATE TABLE users (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  azure_ad_id     TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  department      TEXT,
  job_title       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  role            "UserRole"   NOT NULL DEFAULT 'MEDEWERKER',
  status          "UserStatus" NOT NULL DEFAULT 'PENDING',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMP,
  approved_at     TIMESTAMP,
  approved_by_id  TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT users_approved_by_id_fkey
    FOREIGN KEY (approved_by_id) REFERENCES users(id)
);

-- =========================================================================
-- campuses & locations
-- =========================================================================
CREATE TABLE campuses (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL UNIQUE,
  code       TEXT NOT NULL UNIQUE,
  address    TEXT,
  city       TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campus_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  building    TEXT,
  floor       TEXT,
  room        TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT locations_campus_id_fkey
    FOREIGN KEY (campus_id) REFERENCES campuses(id),
  CONSTRAINT locations_campus_id_name_key UNIQUE (campus_id, name)
);

-- =========================================================================
-- categories (self-referencing)
-- =========================================================================
CREATE TABLE categories (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  parent_id   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- =========================================================================
-- request_bundles & work_requests
-- =========================================================================
CREATE TABLE request_bundles (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE work_requests (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_number      TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  requested_by_id     TEXT NOT NULL,
  campus_id           TEXT NOT NULL,
  location_id         TEXT,
  category_id         TEXT,
  priority            "Priority"          NOT NULL DEFAULT 'NORMAAL',
  suggested_priority  "Priority",
  status              "WorkRequestStatus" NOT NULL DEFAULT 'INGEDIEND',
  rejection_reason    TEXT,
  resolved_at         TIMESTAMP,
  bundle_id           TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT work_requests_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES users(id),
  CONSTRAINT work_requests_campus_id_fkey       FOREIGN KEY (campus_id)       REFERENCES campuses(id),
  CONSTRAINT work_requests_location_id_fkey     FOREIGN KEY (location_id)     REFERENCES locations(id),
  CONSTRAINT work_requests_category_id_fkey     FOREIGN KEY (category_id)     REFERENCES categories(id),
  CONSTRAINT work_requests_bundle_id_fkey       FOREIGN KEY (bundle_id)       REFERENCES request_bundles(id)
);
CREATE INDEX work_requests_status_idx          ON work_requests(status);
CREATE INDEX work_requests_campus_id_idx       ON work_requests(campus_id);
CREATE INDEX work_requests_requested_by_id_idx ON work_requests(requested_by_id);
CREATE INDEX work_requests_created_at_idx      ON work_requests(created_at);

-- =========================================================================
-- projects
-- =========================================================================
CREATE TABLE projects (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_number    TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  campus_id         TEXT,
  manager_id        TEXT,
  created_by_id     TEXT NOT NULL,
  work_request_id   TEXT UNIQUE,
  status            "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
  budget_estimate   DECIMAL(12,2),
  budget_approved   DECIMAL(12,2),
  budget_spent      DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date        TIMESTAMP,
  end_date          TIMESTAMP,
  completed_at      TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_campus_id_fkey       FOREIGN KEY (campus_id)       REFERENCES campuses(id),
  CONSTRAINT projects_manager_id_fkey      FOREIGN KEY (manager_id)      REFERENCES users(id),
  CONSTRAINT projects_created_by_id_fkey   FOREIGN KEY (created_by_id)   REFERENCES users(id),
  CONSTRAINT projects_work_request_id_fkey FOREIGN KEY (work_request_id) REFERENCES work_requests(id)
);
CREATE INDEX projects_status_idx    ON projects(status);
CREATE INDEX projects_campus_id_idx ON projects(campus_id);

-- =========================================================================
-- tasks & task_logs
-- =========================================================================
CREATE TABLE tasks (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_number       TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  assigned_to_id    TEXT,
  created_by_id     TEXT NOT NULL,
  work_request_id   TEXT,
  project_id        TEXT,
  category_id       TEXT,
  priority          "Priority"   NOT NULL DEFAULT 'NORMAAL',
  status            "TaskStatus" NOT NULL DEFAULT 'OPEN',
  start_date        TIMESTAMP,
  due_date          TIMESTAMP,
  completed_at      TIMESTAMP,
  estimated_hours   DOUBLE PRECISION,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_assigned_to_id_fkey  FOREIGN KEY (assigned_to_id)  REFERENCES users(id),
  CONSTRAINT tasks_created_by_id_fkey   FOREIGN KEY (created_by_id)   REFERENCES users(id),
  CONSTRAINT tasks_work_request_id_fkey FOREIGN KEY (work_request_id) REFERENCES work_requests(id),
  CONSTRAINT tasks_project_id_fkey      FOREIGN KEY (project_id)      REFERENCES projects(id),
  CONSTRAINT tasks_category_id_fkey     FOREIGN KEY (category_id)     REFERENCES categories(id)
);
CREATE INDEX tasks_status_idx         ON tasks(status);
CREATE INDEX tasks_assigned_to_id_idx ON tasks(assigned_to_id);
CREATE INDEX tasks_project_id_idx     ON tasks(project_id);
CREATE INDEX tasks_due_date_idx       ON tasks(due_date);

CREATE TABLE task_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  description   TEXT NOT NULL,
  hours_worked  DOUBLE PRECISION,
  log_date      TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT task_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX task_logs_task_id_idx ON task_logs(task_id);

-- =========================================================================
-- purchase_requests & purchase_approvals
-- =========================================================================
CREATE TABLE purchase_requests (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_number   TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  requested_by_id   TEXT NOT NULL,
  work_request_id   TEXT,
  task_id           TEXT,
  project_id        TEXT,
  type              "PurchaseType"   NOT NULL DEFAULT 'KLEIN',
  status            "PurchaseStatus" NOT NULL DEFAULT 'AANGEVRAAGD',
  estimated_cost    DECIMAL(12,2) NOT NULL,
  actual_cost       DECIMAL(12,2),
  supplier          TEXT,
  order_reference   TEXT,
  rejection_reason  TEXT,
  ordered_at        TIMESTAMP,
  delivered_at      TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT purchase_requests_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES users(id),
  CONSTRAINT purchase_requests_work_request_id_fkey FOREIGN KEY (work_request_id) REFERENCES work_requests(id),
  CONSTRAINT purchase_requests_task_id_fkey         FOREIGN KEY (task_id)         REFERENCES tasks(id),
  CONSTRAINT purchase_requests_project_id_fkey      FOREIGN KEY (project_id)      REFERENCES projects(id)
);
CREATE INDEX purchase_requests_status_idx          ON purchase_requests(status);
CREATE INDEX purchase_requests_requested_by_id_idx ON purchase_requests(requested_by_id);

CREATE TABLE purchase_approvals (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_id TEXT NOT NULL,
  approver_id TEXT NOT NULL,
  approved    BOOLEAN NOT NULL,
  comment     TEXT,
  approved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT purchase_approvals_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
  CONSTRAINT purchase_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES users(id),
  CONSTRAINT purchase_approvals_purchase_id_approver_id_key UNIQUE (purchase_id, approver_id)
);

-- =========================================================================
-- comments & attachments
-- =========================================================================
CREATE TABLE comments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content         TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  work_request_id TEXT,
  task_id         TEXT,
  project_id      TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT comments_user_id_fkey         FOREIGN KEY (user_id)         REFERENCES users(id),
  CONSTRAINT comments_work_request_id_fkey FOREIGN KEY (work_request_id) REFERENCES work_requests(id) ON DELETE CASCADE,
  CONSTRAINT comments_task_id_fkey         FOREIGN KEY (task_id)         REFERENCES tasks(id)         ON DELETE CASCADE,
  CONSTRAINT comments_project_id_fkey      FOREIGN KEY (project_id)      REFERENCES projects(id)      ON DELETE CASCADE
);
CREATE INDEX comments_work_request_id_idx ON comments(work_request_id);
CREATE INDEX comments_task_id_idx         ON comments(task_id);
CREATE INDEX comments_project_id_idx      ON comments(project_id);

CREATE TABLE attachments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_name       TEXT NOT NULL,
  original_name   TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size            INTEGER NOT NULL,
  url             TEXT NOT NULL,
  work_request_id TEXT,
  task_id         TEXT,
  project_id      TEXT,
  purchase_id     TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT attachments_work_request_id_fkey FOREIGN KEY (work_request_id) REFERENCES work_requests(id)     ON DELETE CASCADE,
  CONSTRAINT attachments_task_id_fkey         FOREIGN KEY (task_id)         REFERENCES tasks(id)             ON DELETE CASCADE,
  CONSTRAINT attachments_project_id_fkey      FOREIGN KEY (project_id)      REFERENCES projects(id)          ON DELETE CASCADE,
  CONSTRAINT attachments_purchase_id_fkey     FOREIGN KEY (purchase_id)     REFERENCES purchase_requests(id) ON DELETE CASCADE
);

-- =========================================================================
-- notifications, system_config, audit_logs
-- =========================================================================
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL,
  type        "NotificationType" NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  entity_type TEXT,
  entity_id   TEXT,
  email_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX notifications_user_id_is_read_idx ON notifications(user_id, is_read);
CREATE INDEX notifications_created_at_idx      ON notifications(created_at);

CREATE TABLE system_config (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX audit_logs_entity_type_entity_id_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_user_id_idx               ON audit_logs(user_id);
CREATE INDEX audit_logs_created_at_idx            ON audit_logs(created_at);
