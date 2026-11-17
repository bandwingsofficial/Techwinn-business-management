export const PROJECT_NUMBER_PREFIX = 'TECH-PRJ';

const PROJECT_NUMBER_PATTERN = /^TECH-PRJ-\d{4,}$/;

export function formatProjectNumber(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Project sequence number must be a positive integer.');
  }
  return `${PROJECT_NUMBER_PREFIX}-${String(sequenceNumber).padStart(4, '0')}`;
}

export function isValidProjectNumber(projectNumber: string): boolean {
  return PROJECT_NUMBER_PATTERN.test(projectNumber.trim().toUpperCase());
}

export function parseProjectNumberSequence(projectNumber: string): number | null {
  const trimmed = projectNumber.trim().toUpperCase();
  const match = /^TECH-PRJ-(\d+)$/.exec(trimmed);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
