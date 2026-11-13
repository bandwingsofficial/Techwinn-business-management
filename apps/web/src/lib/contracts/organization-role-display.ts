import { isSuperAdminPortalSlug } from './permissions';

/** User-facing organization role label (never exposes legacy “Owner” for Super Admin). */
export function resolveOrganizationRoleDisplayName(input: {
  readonly portalSlug: string;
  readonly name: string;
}): string {
  if (isSuperAdminPortalSlug(input.portalSlug)) {
    return 'Super Admin';
  }
  const trimmed = input.name?.trim();
  if (trimmed) return trimmed;
  return input.portalSlug
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
