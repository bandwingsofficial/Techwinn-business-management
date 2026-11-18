import type { Prisma } from '../../generated/prisma/client.js';
import {
  formatClientReferenceNumber,
  formatEmployeeCode,
  formatProjectNumber,
  formatQuotationDocumentNumber,
  formatServicePackageCode,
  parseClientReferenceSequence,
  parseEmployeeCodeSequence,
  parseProjectNumberSequence,
  parseQuotationDocumentSequence,
  parseServicePackageCodeSequence,
} from '#validation';

export function maxSequenceFromCodeStrings(
  codes: readonly string[],
  parseSequence: (code: string) => number | null,
): number {
  let max = 0;
  for (const code of codes) {
    const normalized = code.trim().toUpperCase();
    const parsed = parseSequence(normalized);
    if (parsed !== null && parsed > max) {
      max = parsed;
    }
  }
  return max;
}

export async function maxClientReferenceSequence(
  db: Pick<Prisma.TransactionClient, 'client'>,
  organizationId: string,
): Promise<number> {
  const rows = await db.client.findMany({
    where: { organizationId },
    select: { referenceNumber: true },
  });
  return maxSequenceFromCodeStrings(
    rows.map((row) => row.referenceNumber),
    parseClientReferenceSequence,
  );
}

export async function maxEmployeeCodeSequence(
  db: Pick<Prisma.TransactionClient, 'employee' | 'employeeHistoricalIdentity'>,
  organizationId: string,
): Promise<number> {
  const [employeeRows, identityRows] = await Promise.all([
    db.employee.findMany({
      where: { organizationId },
      select: { employeeCode: true },
    }),
    db.employeeHistoricalIdentity.findMany({
      where: { organizationId },
      select: { employeeCode: true },
    }),
  ]);
  const codes = [
    ...employeeRows.map((row) => row.employeeCode),
    ...identityRows.map((row) => row.employeeCode),
  ];
  return maxSequenceFromCodeStrings(codes, parseEmployeeCodeSequence);
}

export async function maxProjectNumberSequence(
  db: Pick<Prisma.TransactionClient, 'project'>,
  organizationId: string,
): Promise<number> {
  const rows = await db.project.findMany({
    where: { organizationId },
    select: { projectNumber: true },
  });
  return maxSequenceFromCodeStrings(rows.map((row) => row.projectNumber), parseProjectNumberSequence);
}

export async function maxServicePackageCodeSequence(
  db: Pick<Prisma.TransactionClient, 'servicePackage'>,
  organizationId: string,
): Promise<number> {
  const rows = await db.servicePackage.findMany({
    where: { organizationId },
    select: { code: true },
  });
  return maxSequenceFromCodeStrings(rows.map((row) => row.code), parseServicePackageCodeSequence);
}

export async function maxQuotationDocumentSequence(
  db: Pick<Prisma.TransactionClient, 'quotationDocument'>,
  organizationId: string,
  type: 'QUOTATION' | 'PROPOSAL',
): Promise<number> {
  const rows = await db.quotationDocument.findMany({
    where: { organizationId, type },
    select: { documentNumber: true },
  });
  return maxSequenceFromCodeStrings(
    rows.map((row) => row.documentNumber),
    (code) => parseQuotationDocumentSequence(code, type),
  );
}

export function nextClientReferencePreview(maxAssigned: number): string {
  return formatClientReferenceNumber(maxAssigned + 1);
}

export function nextEmployeeCodePreview(maxAssigned: number): string {
  return formatEmployeeCode(maxAssigned + 1);
}

export function nextProjectNumberPreview(maxAssigned: number): string {
  return formatProjectNumber(maxAssigned + 1);
}

export function nextServicePackageCodePreview(maxAssigned: number): string {
  return formatServicePackageCode(maxAssigned + 1);
}

export function nextQuotationDocumentPreview(
  maxAssigned: number,
  type: 'QUOTATION' | 'PROPOSAL',
): string {
  return formatQuotationDocumentNumber(type, maxAssigned + 1);
}