export const ORGANIZATION_CODE_DUPLICATE_MESSAGE = 'This code already exists.';

export class OrganizationCodeDuplicateError extends Error {
  constructor(readonly fieldPath: string) {
    super(ORGANIZATION_CODE_DUPLICATE_MESSAGE);
    this.name = 'OrganizationCodeDuplicateError';
  }
}