export type { CatalogOption, CatalogOptionGroup, CatalogSelection } from './types';
export {
  buildGroups,
  buildOptions,
  customCatalogSelection,
  flattenGroups,
} from './build';
export {
  TECHNOLOGY_STACK_GROUPS,
  TECHNOLOGY_STACK_OPTIONS,
} from './data/technologies';
export { INCLUDED_PAGES_GROUPS, INCLUDED_PAGES_OPTIONS } from './data/pages';
export { INTEGRATIONS_GROUPS, INTEGRATIONS_OPTIONS } from './data/integrations';
export { ADMIN_PANEL_GROUPS, ADMIN_PANEL_OPTIONS } from './data/admin-panel';
export {
  HOSTING_DEPLOYMENT_GROUPS,
  HOSTING_DEPLOYMENT_OPTIONS,
} from './data/deployment';
export {
  DELIVERY_SERVICES_GROUPS,
  DELIVERY_SERVICES_OPTIONS,
} from './data/delivery';
export { PACKAGE_CATEGORY_GROUPS } from './data/package-categories';

import type { CatalogSelection } from './types';

export function dedupeSelections(
  selections: readonly {
    readonly id: string;
    readonly label: string;
    readonly category?: string;
    readonly custom?: boolean;
  }[],
): CatalogSelection[] {
  const map = new Map<string, CatalogSelection>();
  for (const item of selections) {
    if (!item.id.trim() || !item.label.trim()) continue;
    map.set(item.id, {
      id: item.id,
      label: item.label.trim(),
      ...(item.category ? { category: item.category } : {}),
      ...(item.custom ? { custom: true } : {}),
    });
  }
  return [...map.values()];
}
