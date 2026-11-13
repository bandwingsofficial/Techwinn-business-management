-- Granular CRM Service Packages permissions (replaces settings.read/manage for package access).
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.service_packages.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'settings.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.service_packages.view_details'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'settings.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.service_packages.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'settings.manage'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.service_packages.status'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'settings.manage'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.service_packages.edit'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'settings.manage'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.service_packages.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'settings.manage'
ON CONFLICT DO NOTHING;

-- Roles with manage-only package access still need listing view.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'crm.service_packages.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'settings.manage'
  AND NOT EXISTS (
    SELECT 1
    FROM "organization_role_permissions" existing
    WHERE existing."role_id" = p."role_id"
      AND existing."permission_key" = 'crm.service_packages.view'
  )
ON CONFLICT DO NOTHING;
