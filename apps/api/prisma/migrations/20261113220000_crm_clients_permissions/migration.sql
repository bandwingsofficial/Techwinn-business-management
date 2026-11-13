INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.clients.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'clients.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.clients.view_details'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'clients.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.clients.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'clients.create'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.clients.edit'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'clients.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.clients.status'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'clients.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.clients.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'clients.delete'
ON CONFLICT DO NOTHING;
