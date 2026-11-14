-- Platform sign-in tombstones (preserve RESTRICT author FKs)
ALTER TABLE "platform_admins"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "archived_email" VARCHAR(254);

-- Employee soft delete (attendance/leave rows keep employee_id)
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "employees_organization_id_deleted_at_idx"
  ON "employees" ("organization_id", "deleted_at");

-- Daily task activity actor snapshots
ALTER TABLE "daily_task_activities"
  ADD COLUMN IF NOT EXISTS "actor_display_name_snapshot" VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "actor_email_snapshot" VARCHAR(254) NOT NULL DEFAULT '';

UPDATE "daily_task_activities" AS a
SET
  "actor_display_name_snapshot" = COALESCE(NULLIF(TRIM(p."display_name"), ''), a."actor_display_name_snapshot"),
  "actor_email_snapshot" = COALESCE(NULLIF(TRIM(p."email"), ''), a."actor_email_snapshot")
FROM "platform_admins" AS p
WHERE p."id" = a."actor_admin_id"
  AND (a."actor_display_name_snapshot" = '' OR a."actor_email_snapshot" = '');