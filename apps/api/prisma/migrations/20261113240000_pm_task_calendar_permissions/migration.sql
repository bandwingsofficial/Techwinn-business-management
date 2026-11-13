INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."role_id", 'project_management.task_calendar.view'
FROM (
  SELECT
    p."role_id",
    bool_or(p."permission_key" = 'tasks.read') AS has_tasks_read,
    bool_or(p."permission_key" = 'projects.read') AS has_projects_read
  FROM "organization_role_permissions" p
  WHERE p."permission_key" IN ('tasks.read', 'projects.read')
  GROUP BY p."role_id"
) r
WHERE r.has_tasks_read AND r.has_projects_read
ON CONFLICT DO NOTHING;
