import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import { OrgAccessConflictError } from '../../../../domain/errors/org-access.errors.js';
import type { PreparedMemberAccount } from '../../../../domain/repositories/org-access.repository.js';
import type { EmployeeLoginRemoval } from '../../../../domain/ports/member-account-transaction.port.js';
import { archivePlatformAdminInTransaction } from './platform-admin-archive.js';

type MemberAccountWrite = {
  readonly account: PreparedMemberAccount;
  readonly displayName: string;
  readonly phone: string | null;
  /** A deactivated membership also disables sign-in for the new account. */
  readonly membershipStatus: 'ACTIVE' | 'DEACTIVATED';
  readonly auditMetadata?: Prisma.InputJsonValue;
};

/**
 * Creates the sign-in account, its organization membership and role links inside the
 * caller's transaction so employee and account records are committed together.
 */
export async function createMemberAccountInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: MemberAccountWrite,
  actorAdminId: string,
): Promise<{ membershipId: string; adminId: string }> {
  const { account } = input;
  const now = new Date();

  await tx.platformAdmin.create({
    data: {
      id: account.adminId,
      email: account.email,
      displayName: input.displayName,
      phone: input.phone,
      role: 'ORGANIZATION_MEMBER',
      status: input.membershipStatus === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
      passwordHash: account.passwordHash,
      totpSecretCiphertext: account.totpSecretCiphertext,
      organizationId,
    },
  });

  const membershipId = randomUUID();
  await tx.organizationMembership.create({
    data: {
      id: membershipId,
      organizationId,
      adminId: account.adminId,
      status: input.membershipStatus,
      isOwner: account.isOwner,
      invitedByAdminId: actorAdminId,
      invitedAt: now,
      acceptedAt: now,
      roleLinks: { create: account.roleIds.map((roleId) => ({ roleId })) },
    },
  });

  await tx.crmAuditEvent.create({
    data: {
      organizationId,
      adminId: actorAdminId,
      type: 'MEMBER_UPDATED',
      entityType: 'membership',
      entityId: membershipId,
      metadata: {
        provisioned: true,
        email: account.email,
        roleIds: [...account.roleIds],
        ...(input.auditMetadata as Record<string, unknown> | undefined),
      } satisfies Prisma.InputJsonObject,
    },
  });

  return { membershipId, adminId: account.adminId };
}

/**
 * Removes the sign-in access that belongs to a deleted employee, inside the caller's
 * transaction. Historical business records keep their author foreign keys; the account is
 * tombstoned instead of physically deleted.
 */
export async function removeEmployeeLoginInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: { readonly adminId: string; readonly ownedByEmployee: boolean },
): Promise<EmployeeLoginRemoval> {
  if (!input.ownedByEmployee) return 'ACCOUNT_PRESERVED';
  const account = await tx.platformAdmin.findUnique({
    where: { id: input.adminId },
    select: { role: true, deletedAt: true, memberships: { select: { id: true, organizationId: true } } },
  });
  if (!account || account.role === 'SUPER_ADMIN' || account.deletedAt) return 'ACCOUNT_PRESERVED';

  const otherOrganizations = account.memberships.filter(
    (membership) => membership.organizationId !== organizationId,
  );
  if (otherOrganizations.length > 0) {
    await tx.organizationMembership.deleteMany({ where: { organizationId, adminId: input.adminId } });
    return 'MEMBERSHIP_REMOVED';
  }

  await tx.organizationMembership.deleteMany({ where: { adminId: input.adminId } });
  await archivePlatformAdminInTransaction(tx, input.adminId);
  return 'ACCOUNT_DELETED';
}

export type MemberAccountDeletion = 'ACCOUNT_DELETED' | 'MEMBERSHIP_REMOVED';

/**
 * Permanently removes one organization's membership. The sign-in account is tombstoned when it
 * is not shared across organizations. Employee HR records are unlinked and kept.
 */
export async function deleteOrganizationMemberInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: { readonly adminId: string; readonly membershipId: string },
): Promise<MemberAccountDeletion> {
  const account = await tx.platformAdmin.findUnique({
    where: { id: input.adminId },
    select: { role: true, deletedAt: true, memberships: { select: { id: true, organizationId: true } } },
  });
  if (!account) throw new OrgAccessConflictError('This sign-in account was not found.');
  if (account.role === 'SUPER_ADMIN') {
    throw new OrgAccessConflictError('The Owner account cannot be deleted.');
  }
  if (account.deletedAt) {
    throw new OrgAccessConflictError('This sign-in account has already been removed.');
  }

  const otherOrganizations = account.memberships.filter(
    (membership) => membership.organizationId !== organizationId,
  );
  const exclusive = otherOrganizations.length === 0;

  await tx.employee.updateMany({
    where: { platformAdminId: input.adminId },
    data: { platformAdminId: null, ownsLoginAccount: false },
  });

  const now = new Date();
  await tx.platformSession.updateMany({
    where: { adminId: input.adminId, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now, revokedReason: 'REVOKED' },
  });

  await tx.organizationMembershipRole.deleteMany({ where: { membershipId: input.membershipId } });
  await tx.organizationMembership.deleteMany({
    where: { id: input.membershipId, organizationId },
  });

  if (!exclusive) return 'MEMBERSHIP_REMOVED';

  await archivePlatformAdminInTransaction(tx, input.adminId);
  return 'ACCOUNT_DELETED';
}