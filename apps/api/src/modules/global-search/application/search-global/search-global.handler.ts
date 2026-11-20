import { Inject, Injectable } from '@nestjs/common';
import type { GlobalSearchResponse } from '#contracts';
import { GlobalSearchContextService } from '../services/global-search-context.service.js';
import { GlobalSearchPrismaRepository } from '../../infrastructure/persistence/global-search-prisma.repository.js';
import type { OrgAccessActor } from '../../../org-access/application/shared/org-access-actor.js';
import type { GlobalSearchQueryInput } from '../../domain/global-search.types.js';

@Injectable()
export class SearchGlobalHandler {
  constructor(
    @Inject(GlobalSearchContextService) private readonly context: GlobalSearchContextService,
    @Inject(GlobalSearchPrismaRepository) private readonly repository: GlobalSearchPrismaRepository,
  ) {}

  async execute(actor: OrgAccessActor, query: GlobalSearchQueryInput): Promise<GlobalSearchResponse> {
    const ctx = await this.context.build(actor);
    if (query.category && !ctx.allowedCategories.has(query.category)) {
      return { query: query.q, results: [], total: 0, hasMore: false };
    }
  const results = await this.repository.search(ctx, query);
    return {
      query: query.q,
      results,
      total: results.length,
      hasMore: results.length >= query.limit,
    };
  }
}