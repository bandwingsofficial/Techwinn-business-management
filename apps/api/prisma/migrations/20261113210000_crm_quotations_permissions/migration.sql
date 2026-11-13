INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.quotations.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leads.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.quotations.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leads.create'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.quotations.edit'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leads.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.quotations.send'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leads.update'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'crm.quotations.delete'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leads.delete'
ON CONFLICT DO NOTHING;
