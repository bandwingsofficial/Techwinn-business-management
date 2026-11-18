import type { Prisma } from '../../generated/prisma/client.js';

type IdentityWriteClient = Pick<
  Prisma.TransactionClient,
  'employeeHistoricalIdentity'
>;

type EmployeeIdentitySnapshot = {
  readonly organizationId: string;
  readonly id: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly workEmail: string;
  readonly phone: string;
  readonly jobTitle: string;
  readonly department: string | null;
  readonly employmentType: Prisma.EmployeeHistoricalIdentityCreateInput['employmentType'];
  readonly profileImageUrl: string | null;
  readonly profileImageStoredObjectId: string | null;
};

export function employeeHistoricalIdentityCreateData(
  snapshot: EmployeeIdentitySnapshot,
): Prisma.EmployeeHistoricalIdentityCreateInput {
  return {
    id: snapshot.id,
    organization: { connect: { id: snapshot.organizationId } },
    employeeCode: snapshot.employeeCode,
    firstName: snapshot.firstName,
    lastName: snapshot.lastName,
    displayName: snapshot.displayName,
    workEmailSnapshot: snapshot.workEmail,
    phoneSnapshot: snapshot.phone,
    jobTitle: snapshot.jobTitle,
    department: snapshot.department,
    employmentType: snapshot.employmentType,
    profileImageUrlSnapshot: snapshot.profileImageUrl,
    profileImageStoredObjectIdSnapshot: snapshot.profileImageStoredObjectId,
  };
}

export function employeeHistoricalIdentitySyncData(
  snapshot: Omit<EmployeeIdentitySnapshot, 'id' | 'organizationId'>,
): Prisma.EmployeeHistoricalIdentityUpdateInput {
  return {
    employeeCode: snapshot.employeeCode,
    firstName: snapshot.firstName,
    lastName: snapshot.lastName,
    displayName: snapshot.displayName,
    workEmailSnapshot: snapshot.workEmail,
    phoneSnapshot: snapshot.phone,
    jobTitle: snapshot.jobTitle,
    department: snapshot.department,
    employmentType: snapshot.employmentType,
    profileImageUrlSnapshot: snapshot.profileImageUrl,
    profileImageStoredObjectIdSnapshot: snapshot.profileImageStoredObjectId,
  };
}

export async function syncEmployeeHistoricalIdentity(
  tx: IdentityWriteClient,
  snapshot: EmployeeIdentitySnapshot,
): Promise<void> {
  await tx.employeeHistoricalIdentity.upsert({
    where: { id: snapshot.id },
    create: employeeHistoricalIdentityCreateData(snapshot),
    update: employeeHistoricalIdentitySyncData(snapshot),
  });
}

export async function finalizeEmployeeHistoricalIdentity(
  tx: IdentityWriteClient,
  employeeId: string,
  adminId: string,
  snapshot: Omit<EmployeeIdentitySnapshot, 'id' | 'organizationId'>,
): Promise<void> {
  const deletedAt = new Date();
  await tx.employeeHistoricalIdentity.update({
    where: { id: employeeId },
    data: {
      ...employeeHistoricalIdentitySyncData(snapshot),
      permanentlyDeletedAt: deletedAt,
      deletedByAdminId: adminId,
    },
  });
}