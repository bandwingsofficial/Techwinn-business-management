-- Allow multiple leave balance policies per calendar year when effective periods do not overlap.
-- Eligibility is enforced in the repository via date-range overlap checks (deleted rows are hard-deleted).
DROP INDEX IF EXISTS "leave_year_cfg_org_year_key";