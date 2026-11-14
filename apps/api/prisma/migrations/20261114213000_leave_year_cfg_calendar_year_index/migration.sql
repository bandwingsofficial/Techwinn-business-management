-- Non-unique index (replaces former unique constraint) for org + calendar year lookups.
CREATE INDEX IF NOT EXISTS "leave_year_cfg_org_year_idx"
  ON "leave_year_configurations" ("organization_id", "calendar_year");