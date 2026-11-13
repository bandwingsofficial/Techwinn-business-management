-- Rename role key column to portal slug and normalize legacy underscore values.
ALTER TABLE "organization_roles" RENAME COLUMN "key" TO "portal_slug";

UPDATE "organization_roles"
SET "portal_slug" = REPLACE("portal_slug", '_', '-')
WHERE "portal_slug" LIKE '%\_%' ESCAPE '\';
