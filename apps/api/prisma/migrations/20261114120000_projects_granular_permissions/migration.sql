INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", v.key
FROM "organization_role_permissions" p
CROSS JOIN (
  VALUES
    ('projects.status'),
    ('projects.plan.create'),
    ('projects.plan.edit'),
    ('projects.production.start'),
    ('projects.production.view'),
    ('projects.complete')
) AS v(key)
WHERE p."permission_key" = 'projects.update'
ON CONFLICT DO NOTHING;