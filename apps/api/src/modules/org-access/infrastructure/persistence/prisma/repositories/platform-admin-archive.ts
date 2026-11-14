import type { Prisma } from '../../../../../../generated/prisma/client.js';

/**
 * Tombstones a sign-in identity while keeping the row for RESTRICT foreign keys and audit history.
 * Revokes credentials and frees the email address for reuse.
 */
export async function archivePlatformAdminInTransaction(
  tx: Prisma.TransactionClient,
  adminId: string,
): Promise<void> {
  const admin = await tx.platformAdmin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, displayName: true, deletedAt: true },
  });
  if (!admin || admin.deletedAt) return;

  const now = new Date();
  await tx.platformSession.updateMany({
    where: { adminId, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now, revokedReason: 'REVOKED' },
  });
  await tx.platformRefreshToken.updateMany({
    where: { rotatedAt: null, session: { adminId } },
    data: { rotatedAt: now },
  });
  await tx.platformAuthChallenge.deleteMany({ where: { adminId } });

  await tx.platformAdmin.update({
    where: { id: adminId },
    data: {
      status: 'DISABLED',
      deletedAt: now,
      archivedEmail: admin.email,
      email: `deleted-${adminId.replace(/-/g, '')}@archived.invalid`,
    },
  });
}