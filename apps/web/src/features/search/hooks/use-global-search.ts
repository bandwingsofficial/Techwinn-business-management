'use client';

import { GLOBAL_SEARCH_MIN_QUERY_LENGTH } from '@techwin/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchGlobal } from '../api/global-search.api';
import type { GlobalSearchResponse } from '@techwin/contracts';

const DEBOUNCE_MS = 300;

export function useGlobalSearch(active: boolean) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, active]);

  const clear = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    setQuery('');
    setDebouncedQuery('');
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!active) {
      clear();
      return;
    }
    if (debouncedQuery.length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) {
      generationRef.current += 1;
      abortRef.current?.abort();
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const generation = ++generationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    void searchGlobal({ q: debouncedQuery, limit: 15 }, controller.signal)
      .then((response) => {
        if (generation !== generationRef.current) return;
        setData(response);
      })
      .catch((failure: unknown) => {
        if (generation !== generationRef.current) return;
        if (failure instanceof DOMException && failure.name === 'AbortError') return;
        setError('Search failed. Try again.');
        setData(null);
      })
      .finally(() => {
        if (generation === generationRef.current) setLoading(false);
      });

    return () => controller.abort();
  }, [active, debouncedQuery, clear]);

  return {
    query,
    setQuery,
    debouncedQuery,
    loading,
    error,
    data,
    clear,
    retry: () => setDebouncedQuery((value) => value),
  };
}