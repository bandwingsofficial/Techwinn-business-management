export const EMPLOYEE_CODE_PREFIX = 'TECH-EMP';

const EMPLOYEE_CODE_PATTERN = /^TECH-EMP-\d{4,}$/;

export function formatEmployeeCode(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Employee sequence number must be a positive integer.');
  }
  return `${EMPLOYEE_CODE_PREFIX}-${String(sequenceNumber).padStart(4, '0')}`;
}

export function isValidEmployeeCode(code: string): boolean {
  return EMPLOYEE_CODE_PATTERN.test(code.trim().toUpperCase());
}

export function parseEmployeeCodeSequence(code: string): number | null {
  const trimmed = code.trim().toUpperCase();
  const match = /^TECH-EMP-(\d+)$/.exec(trimmed);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
