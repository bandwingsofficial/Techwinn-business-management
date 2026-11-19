import { EMPLOYEE_ROUTES } from '#contracts';

/** Turn stored employee photo fields into a client-fetchable URL (never a raw object id). */
export function resolveEmployeeProfileImageUrl(row: {
  readonly profileImageUrl: string | null;
  readonly profileImageStoredObjectId: string | null;
}): string | null {
  return row.profileImageStoredObjectId
    ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(row.profileImageStoredObjectId)
    : row.profileImageUrl;
}