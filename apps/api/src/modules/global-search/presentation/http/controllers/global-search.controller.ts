import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { GlobalSearchResponse } from '#contracts';
import { parseGlobalSearchQuery } from '#validation';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { toOrgAccessActor } from '../../../../org-access/presentation/http/mappers/org-access-actor.mapper.js';
import { SearchGlobalHandler } from '../../../application/search-global/search-global.handler.js';

@ApiTags('Global search')
@ApiBearerAuth()
@Controller('global-search')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard)
export class GlobalSearchController {
  constructor(@Inject(SearchGlobalHandler) private readonly search: SearchGlobalHandler) {}

  @Get()
  @ApiOperation({ summary: 'Search organization records visible to the signed-in member.' })
  searchGlobal(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: { platformAuth?: { admin: { role: string } } },
    @Query() query: Record<string, unknown>,
  ): Promise<GlobalSearchResponse> {
    const parsed = parseGlobalSearchQuery(query);
    const actor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.search.execute(actor, {
      q: parsed.q,
      limit: parsed.limit,
      category: parsed.category,
    });
  }
}