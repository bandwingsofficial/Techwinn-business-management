-- "Daily Tasks → View Page" (and tasks.read + collaborator keys) used to imply organization-wide
-- daily task visibility. Visibility is now the explicit key below; View Page alone shows only the
-- caller's own assignments. Preserve existing organization visibility for every role that had it,
-- except Employee portal roles, which must only ever see their own tasks.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT r."id", 'project_management.daily_tasks.view_all'
FROM "organization_roles" r
WHERE r."portal_slug" <> 'employee'
  AND (
    EXISTS (
      SELECT 1 FROM "organization_role_permissions" p
      WHERE p."role_id" = r."id"
        AND p."permission_key" = 'project_management.daily_tasks.view'
    )
    OR (
      EXISTS (
        SELECT 1 FROM "organization_role_permissions" p
        WHERE p."role_id" = r."id"
          AND p."permission_key" = 'tasks.read'
      )
      AND EXISTS (
        SELECT 1 FROM "organization_role_permissions" p
        WHERE p."role_id" = r."id"
          AND p."permission_key" IN ('employees.view', 'leads.read', 'clients.read')
      )
    )
  )
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'project_management.daily_tasks.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'project_management.daily_tasks.view_all'
ON CONFLICT DO NOTHING;
