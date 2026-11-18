-- Historical employee identity (shared id with active employee while employed)
CREATE TABLE "employee_historical_identities" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "employee_code" VARCHAR(32) NOT NULL,
  "first_name" VARCHAR(80) NOT NULL,
  "last_name" VARCHAR(80) NOT NULL,
  "display_name" VARCHAR(160) NOT NULL,
  "work_email_snapshot" VARCHAR(254) NOT NULL,
  "phone_snapshot" VARCHAR(32) NOT NULL DEFAULT '',
  "job_title" VARCHAR(120) NOT NULL,
  "department" VARCHAR(120),
  "employment_type" "EmployeeEmploymentType" NOT NULL,
  "profile_image_url_snapshot" VARCHAR(512),
  "profile_image_stored_object_id_snapshot" UUID,
  "permanently_deleted_at" TIMESTAMPTZ(3),
  "deleted_by_admin_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "employee_historical_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_historical_identities_organization_id_employee_code_key"
  ON "employee_historical_identities" ("organization_id", "employee_code");

CREATE INDEX "employee_historical_identities_organization_id_permanently_deleted_at_idx"
  ON "employee_historical_identities" ("organization_id", "permanently_deleted_at");

ALTER TABLE "employee_historical_identities"
  ADD CONSTRAINT "employee_historical_identities_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "employee_historical_identities" (
  "id",
  "organization_id",
  "employee_code",
  "first_name",
  "last_name",
  "display_name",
  "work_email_snapshot",
  "phone_snapshot",
  "job_title",
  "department",
  "employment_type",
  "profile_image_url_snapshot",
  "profile_image_stored_object_id_snapshot",
  "permanently_deleted_at",
  "deleted_by_admin_id",
  "created_at",
  "updated_at"
)
SELECT
  e."id",
  e."organization_id",
  e."employee_code",
  e."first_name",
  e."last_name",
  e."display_name",
  e."work_email",
  e."phone",
  e."job_title",
  e."department",
  e."employment_type",
  e."profile_image_url",
  e."profile_image_stored_object_id",
  CASE WHEN e."deleted_at" IS NOT NULL THEN e."deleted_at" ELSE NULL END,
  NULL,
  e."created_at",
  e."updated_at"
FROM "employees" AS e;

-- Repoint historical child FKs from employees -> employee_historical_identities
ALTER TABLE "employee_salary_structures" DROP CONSTRAINT IF EXISTS "employee_salary_structures_employee_id_fkey";
ALTER TABLE "attendance_records" DROP CONSTRAINT IF EXISTS "attendance_records_employee_id_fkey";
ALTER TABLE "attendance_devices" DROP CONSTRAINT IF EXISTS "attendance_devices_employee_id_fkey";
ALTER TABLE "employee_leave_balances" DROP CONSTRAINT IF EXISTS "employee_leave_balances_employee_id_fkey";
ALTER TABLE "leave_balance_transactions" DROP CONSTRAINT IF EXISTS "leave_balance_transactions_employee_id_fkey";
ALTER TABLE "leave_requests" DROP CONSTRAINT IF EXISTS "leave_requests_employee_id_fkey";

ALTER TABLE "employee_salary_structures"
  ADD CONSTRAINT "employee_salary_structures_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_historical_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_historical_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_devices"
  ADD CONSTRAINT "attendance_devices_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_historical_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_leave_balances"
  ADD CONSTRAINT "employee_leave_balances_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_historical_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_balance_transactions"
  ADD CONSTRAINT "leave_balance_transactions_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_historical_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_requests_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_historical_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_id_fkey"
  FOREIGN KEY ("id") REFERENCES "employee_historical_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;