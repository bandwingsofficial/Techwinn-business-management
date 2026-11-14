-- Attendance: map legacy view_own / view_all to two-page permission keys.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.records.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.view_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.calendar.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.view_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.records.view_details'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.view_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.records.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.correct_records'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.records.edit'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('attendance.correct_records', 'attendance.view_all')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.punch.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.view_own'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'attendance.punch.view_details'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'attendance.view_own'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'attendance.punch.view'
FROM "organization_roles" r
WHERE r."portal_slug" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'attendance.punch.view_details'
FROM "organization_roles" r
WHERE r."portal_slug" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_key" IN ('attendance.view_own', 'attendance.view_all');