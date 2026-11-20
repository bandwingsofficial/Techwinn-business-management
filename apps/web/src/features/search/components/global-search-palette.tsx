'use client';

import type { GlobalSearchResultItem } from '@techwin/contracts';
import {
  Building2,
  CheckSquare,
  Clock3,
  FileText,
  FolderKanban,
  Loader2,
  Package,
  Search,
  Target,
  User,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { cn } from '@/shared/lib/utils';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { GLOBAL_SEARCH_CATEGORY_LABELS } from '../utils/global-search-labels';
import { splitByQueryHighlight } from '../utils/highlight-query';
import { useGlobalSearch } from '../hooks/use-global-search';

const ICONS: Record<string, ReactNode> = {
  task: <CheckSquare className="size-4" aria-hidden="true" />,
  user: <User className="size-4" aria-hidden="true" />,
  clock: <Clock3 className="size-4" aria-hidden="true" />,
  target: <Target className="size-4" aria-hidden="true" />,
  building: <Building2 className="size-4" aria-hidden="true" />,
  folder: <FolderKanban className="size-4" aria-hidden="true" />,
  'check-square': <CheckSquare className="size-4" aria-hidden="true" />,
  package: <Package className="size-4" aria-hidden="true" />,
  'file-text': <FileText className="size-4" aria-hidden="true" />,
};

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitByQueryHighlight(text, query).map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-sm bg-amber-100 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function GlobalSearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toPortalPath } = usePortalNavigation();
  const { query, setQuery, debouncedQuery, loading, error, data, clear } = useGlobalSearch(open);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const flatResults = data?.results ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, GlobalSearchResultItem[]>();
    for (const item of flatResults) {
      const key = item.type;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [flatResults]);

  useEffect(() => {
    if (!open) clear();
  }, [open, clear]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, flatResults.length]);

  const navigate = (item: GlobalSearchResultItem) => {
    onOpenChange(false);
    router.push(toPortalPath(item.url));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(flatResults.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && flatResults[activeIndex]) {
      event.preventDefault();
      navigate(flatResults[activeIndex]);
    }
  };

  useEffect(() => {
    const row = listRef.current?.querySelector(`[data-search-index="${activeIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80dvh,560px)] gap-3 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
        </DialogHeader>
        <div className="border-b px-3 py-2.5">
          <InputGroup leading={<Search className="size-4" aria-hidden="true" />}>
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search for anything…"
              className={cn('h-10 border-0 shadow-none focus-visible:ring-0', inputGroupPaddingClass({ leading: true }))}
              aria-label="Global search"
            />
          </InputGroup>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <p className="text-muted-foreground flex items-center gap-2 px-2 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Searching…
            </p>
          ) : error ? (
            <p className="text-destructive px-2 py-4 text-sm" role="alert">
              {error}
            </p>
          ) : flatResults.length === 0 && debouncedQuery.length >= 2 ? (
            <p className="text-muted-foreground px-2 py-6 text-sm">No results for “{debouncedQuery}”.</p>
          ) : flatResults.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-sm">Type at least 2 characters to search.</p>
          ) : (
            <GroupedSearchResults
              grouped={grouped}
              query={debouncedQuery}
              activeIndex={activeIndex}
              flatResults={flatResults}
              onSelect={navigate}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupedSearchResults({
  grouped,
  query,
  activeIndex,
  flatResults,
  onSelect,
}: {
  grouped: Array<[string, GlobalSearchResultItem[]]>;
  query: string;
  activeIndex: number;
  flatResults: readonly GlobalSearchResultItem[];
  onSelect: (item: GlobalSearchResultItem) => void;
}) {
  return (
    <div className="space-y-3">
      {grouped.map(([type, items]) => (
        <section key={type} aria-label={GLOBAL_SEARCH_CATEGORY_LABELS[type as keyof typeof GLOBAL_SEARCH_CATEGORY_LABELS]}>
          <h3 className="text-muted-foreground px-2 pb-1 text-[11px] font-semibold tracking-wide uppercase">
            {GLOBAL_SEARCH_CATEGORY_LABELS[type as keyof typeof GLOBAL_SEARCH_CATEGORY_LABELS] ?? type}
          </h3>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const index = flatResults.indexOf(item);
              const isActive = index === activeIndex;
              return (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    data-search-index={index}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
                      isActive ? 'bg-muted' : 'hover:bg-muted/70',
                    )}
                    onClick={() => onSelect(item)}
                  >
                    <span className="text-muted-foreground mt-0.5 shrink-0">{ICONS[item.icon] ?? ICONS.task}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-sm font-medium">
                        <Highlighted text={item.title} query={query} />
                      </span>
                      {item.subtitle ? (
                        <span className="text-muted-foreground block truncate text-xs">{item.subtitle}</span>
                      ) : null}
                      {item.description ? (
                        <span className="text-muted-foreground block truncate text-xs">{item.description}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}