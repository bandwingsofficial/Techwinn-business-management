export const CLIENT_REFERENCE_PREFIX = 'CL';

const CLIENT_REFERENCE_PATTERN = /^CL-\d{6}$/;

export function formatClientReferenceNumber(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Client reference sequence must be a positive integer.');
  }
  return `${CLIENT_REFERENCE_PREFIX}-${String(sequenceNumber).padStart(6, '0')}`;
}

export function isValidClientReferenceNumber(referenceNumber: string): boolean {
  return CLIENT_REFERENCE_PATTERN.test(referenceNumber.trim().toUpperCase());
}

export function parseClientReferenceSequence(referenceNumber: string): number | null {
  const trimmed = referenceNumber.trim().toUpperCase();
  const match = /^CL-(\d{6})$/.exec(trimmed);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}