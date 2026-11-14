INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.view_all'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.view_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.create'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.update'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.delete'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.manage_working_days'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.manage_working_days'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.manage_holidays'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.manage_holidays'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'organisation_calendar.export'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'calendar.export'
ON CONFLICT DO NOTHING;

-- Ensure employee system role keeps read-only org calendar access.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'organisation_calendar.view'
FROM "organization_roles" r
WHERE r."portal_slug" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_key" IN (
  'calendar.view',
  'calendar.view_all',
  'calendar.create',
  'calendar.update',
  'calendar.delete',
  'calendar.manage_working_days',
  'calendar.manage_holidays',
  'calendar.export'
);