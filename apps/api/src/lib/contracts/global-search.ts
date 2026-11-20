import { API_PREFIX } from './http.js';

export const GLOBAL_SEARCH_ROUTES = {
  search: `${API_PREFIX}/global-search`,
} as const;

export const GLOBAL_SEARCH_CATEGORIES = [
  'daily_task',
  'employee',
  'employee_profile',
  'attendance',
  'lead',
  'client',
  'project',
  'project_task',
  'service_package',
  'proposal',
] as const;

export type GlobalSearchCategory = (typeof GLOBAL_SEARCH_CATEGORIES)[number];

export type GlobalSearchResultItem = {
  readonly id: string;
  readonly type: GlobalSearchCategory;
  readonly title: string;
  readonly description?: string;
  readonly subtitle?: string;
  /** Portal-neutral admin feature path; the web client maps it to the active portal. */
  readonly url: string;
  readonly icon: string;
};

export type GlobalSearchResponse = {
  readonly query: string;
  readonly results: readonly GlobalSearchResultItem[];
  readonly total: number;
  readonly hasMore: boolean;
};

export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_DEFAULT_LIMIT = 10;
export const GLOBAL_SEARCH_MAX_LIMIT = 25;