-- Rename protected Owner system role to Super Admin (preserve role IDs and memberships).
UPDATE "organization_roles"
SET
  "portal_slug" = 'super-admin',
  "name" = 'Super Admin',
  "description" = 'Full organization administration including users and roles.'
WHERE
  "is_system" = true
  AND ("portal_slug" = 'owner' OR "name" = 'Owner');
