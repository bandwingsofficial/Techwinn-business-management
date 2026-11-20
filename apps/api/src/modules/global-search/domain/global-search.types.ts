import type { GlobalSearchCategory, GlobalSearchResultItem } from '#contracts';
import type { OrgAccessActor } from '../../org-access/application/shared/org-access-actor.js';
import type { PermissionKey } from '#contracts';
import type { GlobalSearchScopeFlags } from '#contracts';

export type GlobalSearchExecutionContext = {
  readonly actor: OrgAccessActor;
  readonly permissions: ReadonlySet<PermissionKey>;
  readonly sessionEmployeeId: string | null;
  readonly scope: GlobalSearchScopeFlags;
  readonly allowedCategories: ReadonlySet<GlobalSearchCategory>;
};

export type GlobalSearchQueryInput = {
  readonly q: string;
  readonly limit: number;
  readonly category?: GlobalSearchCategory;
};

export type GlobalSearchResultRow = GlobalSearchResultItem;