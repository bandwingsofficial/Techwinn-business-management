import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';

export const ORGANIZATION_CODE_DUPLICATE_MESSAGE = 'This code already exists.';

export function applyOrganizationCodeDuplicateError(
  error: unknown,
  fieldKey: string,
  setFieldErrors: (
    value: Record<string, string> | ((previous: Record<string, string>) => Record<string, string>),
  ) => void,
): boolean {
  if (!isApiError(error)) return false;
  if (error.code === API_ERROR_CODES.DUPLICATE_ORGANIZATION_CODE) {
    setFieldErrors((previous) => ({
      ...previous,
      [fieldKey]: ORGANIZATION_CODE_DUPLICATE_MESSAGE,
    }));
    return true;
  }
  const fieldDetail = error.details.find((detail) => detail.path === fieldKey);
  if (fieldDetail?.message === ORGANIZATION_CODE_DUPLICATE_MESSAGE) {
    setFieldErrors((previous) => ({ ...previous, [fieldKey]: fieldDetail.message }));
    return true;
  }
  return false;
}