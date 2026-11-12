-- Deduplicate active single-day status overrides before enforcing uniqueness.
DELETE FROM "organization_calendar_events" AS older
USING "organization_calendar_events" AS newer
WHERE older."organization_id" = newer."organization_id"
  AND older."start_date" = newer."start_date"
  AND older."start_date" = older."end_date"
  AND newer."start_date" = newer."end_date"
  AND older."is_active" = true
  AND newer."is_active" = true
  AND older."event_type" IN ('SPECIAL_WORKING_DAY', 'WEEKLY_OFF', 'HALF_WORKING_DAY')
  AND newer."event_type" IN ('SPECIAL_WORKING_DAY', 'WEEKLY_OFF', 'HALF_WORKING_DAY')
  AND older."id" <> newer."id"
  AND (
    older."created_at" < newer."created_at"
    OR (older."created_at" = newer."created_at" AND older."id"::text < newer."id"::text)
  );

-- At most one active single-day status override per organisation date.
CREATE UNIQUE INDEX IF NOT EXISTS "org_cal_date_status_override_uidx"
ON "organization_calendar_events" ("organization_id", "start_date")
WHERE "start_date" = "end_date"
  AND "is_active" = true
  AND "event_type" IN ('SPECIAL_WORKING_DAY', 'WEEKLY_OFF', 'HALF_WORKING_DAY');

-- Remove redundant WEEKLY_OFF events on dates already covered by the schedule weekly off.
DELETE FROM "organization_calendar_events" AS ev
USING "attendance_schedules" AS sch
WHERE ev."organization_id" = sch."organization_id"
  AND ev."event_type" = 'WEEKLY_OFF'
  AND ev."start_date" = ev."end_date"
  AND ev."is_active" = true
  AND sch."effective_from" = (
    SELECT MAX(s2."effective_from")
    FROM "attendance_schedules" s2
    WHERE s2."organization_id" = ev."organization_id"
      AND s2."effective_from" <= ev."start_date"
  )
  AND (sch."weekly_off_days" @> to_jsonb(EXTRACT(DOW FROM ev."start_date")::int));
