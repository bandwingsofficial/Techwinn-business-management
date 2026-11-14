INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.records.add'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.records.create'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.records.calendar_view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.calendar.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.records.manage_settings'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.manage_settings'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.punch.punch_in'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.punch_in'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.punch.punch_out'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.punch_out'
ON CONFLICT DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_key" IN (
  'attendance.records.create',
  'attendance.calendar.view',
  'attendance.manage_settings',
  'attendance.punch_in',
  'attendance.punch_out'
);