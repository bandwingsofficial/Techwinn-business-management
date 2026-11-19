-- Organization-wide daily task visibility is now the single explicit key
-- `project_management.daily_tasks.view_all`; task edit / assign / delete no longer imply it,
-- so an employee who can edit or be assigned tasks sees only their own assignments.
-- Preserve the organization board for the admin / manager roles that previously relied on
-- "a management key implies organization view". Employee portal roles are excluded and must
-- never gain organization-wide visibility this way.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT r."id", 'project_management.daily_tasks.view_all'
FROM "organization_roles" r
WHERE r."portal_slug" <> 'employee'
  AND EXISTS (
    SELECT 1 FROM "organization_role_permissions" p
    WHERE p."role_id" = r."id"
      AND p."permission_key" IN (
        'tasks.create',
        'tasks.assign',
        'tasks.update',
        'tasks.delete',
        'project_management.daily_tasks.assign',
        'project_management.daily_tasks.edit',
        'project_management.daily_tasks.delete'
      )
  )
ON CONFLICT DO NOTHING;

-- View All Tasks always implies the ability to open the Daily Tasks page.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'project_management.daily_tasks.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'project_management.daily_tasks.view_all'
ON CONFLICT DO NOTHING;
