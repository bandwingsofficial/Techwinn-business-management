-- Default organisation schedule: Sunday weekly off, Monday–Saturday working.
ALTER TABLE "attendance_schedules"
  ALTER COLUMN "weekly_off_days" SET DEFAULT '[0]',
  ALTER COLUMN "working_days" SET DEFAULT '[1,2,3,4,5,6]';

-- Ensure Sunday (0) is always present in weekly_off_days.
UPDATE "attendance_schedules"
SET "weekly_off_days" = CASE
  WHEN jsonb_typeof("weekly_off_days") = 'array'
    AND "weekly_off_days" @> '[0]'::jsonb
    THEN "weekly_off_days"
  WHEN jsonb_typeof("weekly_off_days") = 'array'
    THEN "weekly_off_days" || '[0]'::jsonb
  ELSE '[0]'::jsonb
END;

-- Remove Sunday from working_days when it was incorrectly listed as working.
UPDATE "attendance_schedules"
SET "working_days" = COALESCE((
  SELECT jsonb_agg(elem ORDER BY (elem)::int)
  FROM jsonb_array_elements("working_days") AS elem
  WHERE (elem)::int <> 0
), '[]'::jsonb)
WHERE jsonb_typeof("working_days") = 'array'
  AND "working_days" @> '[0]'::jsonb;

-- Old Mon–Fri defaults left Saturday as NON_WORKING. Promote Saturday to working
-- unless the organisation already marked Saturday as a weekly off.
UPDATE "attendance_schedules"
SET "working_days" = '[1,2,3,4,5,6]'::jsonb
WHERE "working_days" = '[1,2,3,4,5]'::jsonb
  AND NOT ("weekly_off_days" @> '[6]'::jsonb);
