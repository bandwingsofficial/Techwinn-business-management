import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { normalizeStoredOrganizationCode } from './organization-code-normalize.js';

@Injectable()
export class OrganizationCodeAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async isEmployeeCodeAvailable(
    organizationId: string,
    code: string,
    excludeEmployeeId?: string,
  ): Promise<boolean> {
    const normalizedCode = normalizeStoredOrganizationCode(code);
    const existing = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        employeeCode: normalizedCode,
        ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  async isClientReferenceAvailable(
    organizationId: string,
    referenceNumber: string,
    excludeClientId?: string,
  ): Promise<boolean> {
    const normalizedCode = normalizeStoredOrganizationCode(referenceNumber);
    const existing = await this.prisma.client.findFirst({
      where: {
        organizationId,
        referenceNumber: normalizedCode,
        ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  async isServicePackageCodeAvailable(
    organizationId: string,
    code: string,
    excludePackageId?: string,
  ): Promise<boolean> {
    const normalizedCode = normalizeStoredOrganizationCode(code);
    const existing = await this.prisma.servicePackage.findFirst({
      where: {
        organizationId,
        code: normalizedCode,
        ...(excludePackageId ? { id: { not: excludePackageId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  async isQuotationDocumentNumberAvailable(
    organizationId: string,
    documentNumber: string,
    excludeQuotationId?: string,
  ): Promise<boolean> {
    const normalizedCode = normalizeStoredOrganizationCode(documentNumber);
    const existing = await this.prisma.quotationDocument.findFirst({
      where: {
        organizationId,
        documentNumber: normalizedCode,
        ...(excludeQuotationId ? { id: { not: excludeQuotationId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  async isProjectNumberAvailable(
    organizationId: string,
    projectNumber: string,
    excludeProjectId?: string,
  ): Promise<boolean> {
    const normalizedCode = normalizeStoredOrganizationCode(projectNumber);
    const existing = await this.prisma.project.findFirst({
      where: {
        organizationId,
        projectNumber: normalizedCode,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }
}