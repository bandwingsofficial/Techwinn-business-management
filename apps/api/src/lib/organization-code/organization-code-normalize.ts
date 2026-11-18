export function normalizeStoredOrganizationCode(code: string): string {
  return code.trim().toUpperCase();
}