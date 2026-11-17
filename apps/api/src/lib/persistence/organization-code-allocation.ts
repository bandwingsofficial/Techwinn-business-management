import { Prisma } from '../../generated/prisma/client.js';

type SequenceClient = Pick<Prisma.TransactionClient, 'organizationSequence'>;

export async function incrementOrganizationSequence(
  tx: SequenceClient,
  organizationId: string,
  key: string,
): Promise<number> {
  const row = await tx.organizationSequence.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });
  return row.lastValue;
}

/** Raises `lastValue` so auto-generated codes do not reuse numbers already assigned manually. */
export async function bumpOrganizationSequenceFloor(
  tx: SequenceClient,
  organizationId: string,
  key: string,
  floor: number,
): Promise<void> {
  if (!Number.isInteger(floor) || floor < 1) return;
  const existing = await tx.organizationSequence.findUnique({
    where: { organizationId_key: { organizationId, key } },
    select: { lastValue: true },
  });
  if (existing && existing.lastValue >= floor) return;
  await tx.organizationSequence.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, lastValue: floor },
    update: { lastValue: floor },
  });
}

export type ResolveOrganizationCodeOptions = {
  readonly organizationId: string;
  readonly sequenceKey: string;
  readonly providedCode?: string | null;
  readonly formatFromSequence: (sequence: number) => string;
  readonly isValidFormat: (code: string) => boolean;
  readonly parseSequence?: (code: string) => number | null;
  readonly normalize?: (code: string) => string;
  readonly invalidFormatMessage: string;
};

export async function resolveOrganizationCodeOnCreate(
  tx: SequenceClient,
  options: ResolveOrganizationCodeOptions,
): Promise<string> {
  const trimmed = options.providedCode?.trim();
  if (trimmed) {
    const normalized = options.normalize ? options.normalize(trimmed) : trimmed;
    if (!options.isValidFormat(normalized)) {
      throw new OrganizationCodeFormatError(options.invalidFormatMessage);
    }
    const sequence = options.parseSequence?.(normalized) ?? null;
    if (sequence !== null) {
      await bumpOrganizationSequenceFloor(
        tx,
        options.organizationId,
        options.sequenceKey,
        sequence,
      );
    }
    return normalized;
  }
  const sequence = await incrementOrganizationSequence(
    tx,
    options.organizationId,
    options.sequenceKey,
  );
  return options.formatFromSequence(sequence);
}

export class OrganizationCodeFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrganizationCodeFormatError';
  }
}

export function isOrganizationCodeFormatError(error: unknown): error is OrganizationCodeFormatError {
  return error instanceof OrganizationCodeFormatError;
}

export function mapOrganizationCodeUniqueViolation(
  error: unknown,
  dbColumn: string,
  message: string,
  responsePath: string,
): { path: string; message: string } | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null;
  }
  const target = error.meta?.target;
  const targets = Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? [target]
      : [];
  const text = targets.join(' ').toLowerCase();
  if (text.includes(dbColumn.toLowerCase())) {
    return { path: responsePath, message };
  }
  return null;
}