INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.read_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.details.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.read_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.tab.pending'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.read_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.tab.approved'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.read_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.tab.rejected'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.read_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.tab.all'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.read_all'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.approve'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.approve'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'leave.management.reject'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'leave.requests.reject'
ON CONFLICT DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_key" IN (
  'leave.requests.read_all',
  'leave.requests.approve',
  'leave.requests.reject'
);