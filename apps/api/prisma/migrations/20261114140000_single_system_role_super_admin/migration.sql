-- Demote legacy seeded system roles to custom roles; preserve assignments and permission rows.
UPDATE "organization_roles"
SET "is_system" = false
WHERE "is_system" = true
  AND "portal_slug" NOT IN ('super-admin', 'owner');

UPDATE "organization_roles"
SET
  "is_system" = true,
  "name" = 'Super Admin',
  "description" = 'Full organization administration including users and roles.'
WHERE "portal_slug" IN ('super-admin', 'owner');