INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'project_management.daily_tasks.view'
FROM "organization_role_permissions" p
INNER JOIN "organization_roles" r ON r."id" = p."role_id"
WHERE p."permission_key" = 'tasks.read'
  AND r."portal_slug" <> 'employee'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'project_management.daily_tasks.assign'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('tasks.create', 'tasks.assign')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'project_management.daily_tasks.edit'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'tasks.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'project_management.daily_tasks.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'tasks.delete'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'project_management.daily_tasks.move'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('daily_tasks.update_status', 'tasks.progress')
ON CONFLICT DO NOTHING;
