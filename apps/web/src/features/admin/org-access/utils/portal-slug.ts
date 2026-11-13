/** Derives a URL portal slug from a role display name (create flow). */
export function slugifyPortalSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 64);
  if (!slug) return 'role';
  return /^[a-z]/.test(slug) ? slug : `role-${slug}`.slice(0, 64);
}
