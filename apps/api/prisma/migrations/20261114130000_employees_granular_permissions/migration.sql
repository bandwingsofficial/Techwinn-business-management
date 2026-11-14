INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'employees.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'employees.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'employees.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'employees.create'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'employees.edit'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'employees.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'employees.status'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'employees.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'employees.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'employees.update'
ON CONFLICT DO NOTHING;