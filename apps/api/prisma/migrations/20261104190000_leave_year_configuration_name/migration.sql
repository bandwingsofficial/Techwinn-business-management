-- Display name for leave balance / year configurations (matches schema.prisma VarChar(120))
ALTER TABLE "leave_year_configurations" ADD COLUMN "name" VARCHAR(120) NOT NULL DEFAULT '';

UPDATE "leave_year_configurations"
SET "name" = 'Leave policy ' || "calendar_year"::text
WHERE "name" = '';
