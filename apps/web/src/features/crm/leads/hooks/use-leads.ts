'use client';

import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';
import { useCallback } from 'react';
import { listLeads } from '../api/lead.api';
import type { CrmLead, CrmLeadListResponse, LeadListQuery } from '../types/lead.types';
import { leadKeys } from './lead.keys';
import { useLeadAsyncResource } from './use-lead-async-resource';

export type UseLeadsOptions = {
  readonly query: LeadListQuery | null;
  readonly enabled?: boolean;
};

async function fetchLeads(query: LeadListQuery) {
  try {
    return await listLeads(query);
  } catch (failure) {
    const canRetryWithoutKanbanOrder =
      isApiError(failure) &&
      failure.code === API_ERROR_CODES.VALIDATION_FAILED &&
      query.kanbanOrder === true;
    if (!canRetryWithoutKanbanOrder) throw failure;
    return listLeads({ ...query, kanbanOrder: undefined });
  }
}

export function useLeads({ query, enabled = true }: UseLeadsOptions) {
  const isEnabled = enabled && query !== null;
  const cacheKey = JSON.stringify(leadKeys.list(query ?? {}));

  const loader = useCallback(async () => {
    if (!query) {
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }
    return fetchLeads(query);
  }, [query]);

  const { data, loading, error, refetch, patch } = useLeadAsyncResource(
    cacheKey,
    isEnabled,
    loader,
  );

  const patchLeadInList = useCallback(
    (leadId: string, next: (lead: CrmLead) => CrmLead) => {
      patch((current: CrmLeadListResponse | null) => {
        if (!current) return current;
        const items = current.items.map((lead: CrmLead) => (lead.id === leadId ? next(lead) : lead));
        return { ...current, items };
      });
    },
    [patch],
  );

  const replaceLeadInList = useCallback(
    (updated: CrmLead) => {
      patch((current: CrmLeadListResponse | null) => {
        if (!current) return current;
        const items = current.items.map((lead: CrmLead) => (lead.id === updated.id ? updated : lead));
        return { ...current, items };
      });
    },
    [patch],
  );

  return {
    leads: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? query?.page ?? 1,
    pageSize: data?.pageSize ?? query?.pageSize ?? 20,
    loading,
    error,
    refetch,
    patchLeadInList,
    replaceLeadInList,
  };
}
