export const QUOTATION_DOCUMENT_PREFIX = 'TECH-QUO';
export const LEGACY_PROPOSAL_DOCUMENT_PREFIX = 'TECH-PRO';

const QUOTATION_NUMBER_PATTERN = /^TECH-QUO-\d{4,}$/;
const PROPOSAL_NUMBER_PATTERN = /^TECH-PRO-\d{4,}$/;

export function formatQuotationDocumentNumber(
  type: 'QUOTATION' | 'PROPOSAL',
  sequenceNumber: number,
): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Document sequence number must be a positive integer.');
  }
  const prefix =
    type === 'QUOTATION' ? QUOTATION_DOCUMENT_PREFIX : LEGACY_PROPOSAL_DOCUMENT_PREFIX;
  return `${prefix}-${String(sequenceNumber).padStart(4, '0')}`;
}

export function isValidQuotationDocumentNumber(
  documentNumber: string,
  type: 'QUOTATION' | 'PROPOSAL',
): boolean {
  const trimmed = documentNumber.trim().toUpperCase();
  const pattern = type === 'QUOTATION' ? QUOTATION_NUMBER_PATTERN : PROPOSAL_NUMBER_PATTERN;
  return pattern.test(trimmed);
}

export function parseQuotationDocumentSequence(
  documentNumber: string,
  type: 'QUOTATION' | 'PROPOSAL',
): number | null {
  const trimmed = documentNumber.trim().toUpperCase();
  const prefix = type === 'QUOTATION' ? QUOTATION_DOCUMENT_PREFIX : LEGACY_PROPOSAL_DOCUMENT_PREFIX;
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(trimmed);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
