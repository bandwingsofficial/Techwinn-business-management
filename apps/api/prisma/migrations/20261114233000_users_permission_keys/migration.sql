INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'users.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'users.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'users.status.update'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('users.deactivate', 'memberships.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'users.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('users.deactivate', 'memberships.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'users.password.reset'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'users.reset_password'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'users.update'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'users.manage_roles'
  AND NOT EXISTS (
    SELECT 1
    FROM "organization_role_permissions" existing
    WHERE existing."role_id" = p."role_id"
      AND existing."permission_key" = 'users.update'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'users.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'memberships.manage'
  AND NOT EXISTS (
    SELECT 1
    FROM "organization_role_permissions" existing
    WHERE existing."role_id" = p."role_id"
      AND existing."permission_key" = 'users.create'
  )
ON CONFLICT DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_key" IN (
  'users.read',
  'users.deactivate',
  'users.reset_password',
  'users.manage_roles'
);