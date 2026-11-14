INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_balances.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('leave.config.read', 'leave.allocations.read')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_balances.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('leave.config.manage', 'leave.allocations.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_balances.update'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('leave.config.manage', 'leave.allocations.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_balances.toggle_status'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.config.manage'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave_balances.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.config.manage'
ON CONFLICT DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_key" IN (
  'leave.config.read',
  'leave.config.manage',
  'leave.allocations.read',
  'leave.allocations.manage'
);