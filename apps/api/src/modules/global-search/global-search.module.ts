import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { GlobalSearchContextService } from './application/services/global-search-context.service.js';
import { SearchGlobalHandler } from './application/search-global/search-global.handler.js';
import { GlobalSearchPrismaRepository } from './infrastructure/persistence/global-search-prisma.repository.js';
import { GlobalSearchController } from './presentation/http/controllers/global-search.controller.js';

@Module({
  imports: [DatabaseModule, AuthModule, OrgAccessModule],
  controllers: [GlobalSearchController],
  providers: [GlobalSearchContextService, GlobalSearchPrismaRepository, SearchGlobalHandler],
})
export class GlobalSearchModule {}