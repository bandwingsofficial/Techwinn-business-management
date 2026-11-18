import { Module } from '@nestjs/common';
import { OrganizationCodeAvailabilityService } from '../../lib/organization-code/organization-code-availability.service.js';
import { PrismaService } from './prisma.service.js';

@Module({
  providers: [PrismaService, OrganizationCodeAvailabilityService],
  exports: [PrismaService, OrganizationCodeAvailabilityService],
})
export class DatabaseModule {}
