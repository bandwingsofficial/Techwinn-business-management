INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_types.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.types.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_types.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.types.create'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_types.update'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.types.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_types.toggle_status'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.types.manage'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_types.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.types.manage'
ON CONFLICT DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_key" IN (
  'leave.types.read',
  'leave.types.create',
  'leave.types.update',
  'leave.types.manage'
);