
'use client';

import type {
  DashboardDateRangePreset,
  DashboardWidgetDescriptor,
} from '@techwin/contracts';
import { DASHBOARD_VIEW } from '@techwin/contracts';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { usePermissions } from '@/features/auth/components/permissions-provider';
import { formatMembershipRoleDetails } from '@/features/auth/membership/membership-access';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';

import { getDashboardMe, type DashboardQueryRange } from '@/features/dashboard/api/dashboard';
import {
  DashboardHeroKpiRow,
  DashboardHeroKpiRowSkeleton,
} from '@/features/dashboard/components/dashboard-hero-kpi-row';
import { DashboardWidgetCard } from '@/features/dashboard/components/dashboard-widget-card';
import {
  DASHBOARD_GRID_CARD_CLASS,
  DASHBOARD_HERO_KPI_WIDGET_KEYS,
} from '@/features/dashboard/constants/dashboard-theme';
import { DASHBOARD_GRID_CLASS } from '@/features/dashboard/utils/dashboard-grid';

import { cn } from '@/shared/lib/utils';
import '@/features/dashboard/styles/dashboard-page-background.css';

const RANGE_OPTIONS: {
  value: DashboardDateRangePreset;
  label: string;
}[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'year', label: 'This year' },
  { value: 'all_time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export function WorkspaceDashboard() {
  const { admin } = useAuthenticatedAdmin();
  const { roles, has } = usePermissions();

  const roleLabel = formatMembershipRoleDetails(admin, roles);

  const [preset, setPreset] = useState<DashboardDateRangePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo<DashboardQueryRange>(
    () => ({
      preset,
      ...(preset === 'custom' && customFrom && customTo
        ? { from: customFrom, to: customTo }
        : {}),
    }),
    [preset, customFrom, customTo],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [widgets, setWidgets] = useState<
    readonly DashboardWidgetDescriptor[]
  >([]);

  const canViewDashboard = has(DASHBOARD_VIEW);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      return getDashboardMe(range, signal)
        .then((response) => {
          setWidgets(
            response.widgets.filter(
              (widget) => widget.key !== 'overview.welcome',
            ),
          );
        })
        .catch((err: unknown) => {
          if (signal?.aborted) return;

          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load dashboard',
          );
        })
        .finally(() => {
          if (!signal?.aborted) {
            setLoading(false);
          }
        });
    },
    [range],
  );

  const customRangeIncomplete = preset === 'custom' && (!customFrom || !customTo);

  // Bumped by the Refresh button; every KPI card and widget refetches when it changes.
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!canViewDashboard) {
      setLoading(false);
      return;
    }
    // Custom range without both dates: no request; the render branch shows the prompt.
    if (customRangeIncomplete) return;

    // A range change supersedes any refresh still in flight.
    refreshController.current?.abort();
    const controller = new AbortController();

    void load(controller.signal);

    return () => controller.abort();
  }, [canViewDashboard, customRangeIncomplete, load]);

  useEffect(() => () => refreshController.current?.abort(), []);

  const handleRefresh = useCallback(() => {
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    setRefreshToken((token) => token + 1);
    void load(controller.signal);
  }, [load]);

  const periodLabel = useMemo(() => {
    if (preset === 'custom') {
      return customFrom && customTo ? `${customFrom} to ${customTo}` : 'Custom range';
    }
    return RANGE_OPTIONS.find((option) => option.value === preset)?.label ?? '';
  }, [preset, customFrom, customTo]);

  const heroKpiWidgetKeys = useMemo(
    () =>
      widgets
        .map((widget) => widget.key)
        .filter((key) =>
          DASHBOARD_HERO_KPI_WIDGET_KEYS.includes(
            key as (typeof DASHBOARD_HERO_KPI_WIDGET_KEYS)[number],
          ),
        ),
    [widgets],
  );

  const gridWidgets = useMemo(
    () =>
      widgets.filter(
        (widget) =>
          !DASHBOARD_HERO_KPI_WIDGET_KEYS.includes(
            widget.key as (typeof DASHBOARD_HERO_KPI_WIDGET_KEYS)[number],
          ),
      ),
    [widgets],
  );

  const welcomeLine = useMemo(() => {
    const name = admin.displayName?.trim();
    const role = roleLabel?.trim();

    if (!name && !role) return 'Welcome back!';
    if (!name) return `Welcome back, ${role}!`;
    if (!role) return `Welcome back, ${name}!`;

    const nameKey = name.toLowerCase();
    const roleKey = role.toLowerCase();

    if (
      nameKey === roleKey ||
      nameKey.includes(roleKey) ||
      roleKey.includes(nameKey)
    ) {
      return `Welcome back, ${name}!`;
    }

    return `Welcome back, ${name}! · ${role}`;
  }, [admin.displayName, roleLabel]);

  if (!canViewDashboard) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <h1 className="type-page-title">
          Dashboard unavailable
        </h1>

        <p className="text-sm text-muted-foreground">
          Your account does not have permission to view the dashboard.
          Contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="tw-dashboard-page -mx-4 min-h-full w-full overflow-x-hidden px-4 py-2 pb-10 sm:-mx-5 sm:px-5">
      <div className="w-full min-w-0 space-y-6">

        {/* Dashboard heading and controls */}
        <header className="pt-2 pb-2 sm:pt-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div className="grid min-w-0 gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#1B2B4D] sm:text-[2rem]">
                Dashboard <span aria-hidden="true">👋</span>
              </h1>

              <p className="text-base font-semibold text-[#243656] sm:text-lg">
                {welcomeLine}
              </p>

              <p className="max-w-xl text-sm leading-snug text-[#5B6F8E]">
                Here&apos;s what&apos;s happening across your organization
                {periodLabel ? ` · ${periodLabel}` : ''}.
              </p>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-3 md:shrink-0">
              <Select
                value={preset}
                onValueChange={(value) =>
                  setPreset(value as DashboardDateRangePreset)
                }
              >
                <SelectTrigger className="h-10 w-[min(168px,72vw)] shrink-0 border-[#D4DEF7] bg-white shadow-[0_2px_8px_rgba(79,111,196,0.08)]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>

                <SelectContent>
                  {RANGE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {preset === 'custom' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="h-10 rounded-md border border-[#D4DEF7] bg-white px-2 text-sm shadow-[0_2px_8px_rgba(79,111,196,0.08)]"
                    aria-label="Custom range start"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="h-10 rounded-md border border-[#D4DEF7] bg-white px-2 text-sm shadow-[0_2px_8px_rgba(79,111,196,0.08)]"
                    aria-label="Custom range end"
                  />
                </div>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 border-[#D4DEF7] bg-white shadow-[0_2px_8px_rgba(79,111,196,0.08)]"
                onClick={handleRefresh}
                disabled={loading || (preset === 'custom' && (!customFrom || !customTo))}
                aria-label="Refresh dashboard"
              >
                <RefreshCw
                  className={cn(
                    'size-4',
                    loading && 'animate-spin',
                  )}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </header>

        {/* An incomplete custom range has no dates yet; never fetch (the API would fall back to
            This month and show numbers for a period the user did not choose). */}
        {heroKpiWidgetKeys.length > 0 && !customRangeIncomplete ? (
          loading && widgets.length === 0 ? (
            <DashboardHeroKpiRowSkeleton />
          ) : (
            <DashboardHeroKpiRow
              enabledWidgetKeys={heroKpiWidgetKeys}
              range={range}
              refreshToken={refreshToken}
            />
          )
        ) : null}

        {/* Dashboard content */}
        {customRangeIncomplete ? (
          <div className={`${DASHBOARD_GRID_CARD_CLASS} rounded-xl bg-white p-10 text-center`}>
            <p className="text-sm text-muted-foreground">
              Choose a start and end date to load dashboard data.
            </p>
          </div>
        ) : loading && widgets.length === 0 ? (
          <div className={cn(DASHBOARD_GRID_CLASS)}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`${DASHBOARD_GRID_CARD_CLASS} col-span-1 h-[280px] animate-pulse rounded-xl bg-white sm:col-span-2 xl:col-span-2`}
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white/90 p-5">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </div>
        ) : widgets.length === 0 ? (
          <div className={`${DASHBOARD_GRID_CARD_CLASS} rounded-xl bg-white p-10 text-center`}>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Your dashboard is ready.
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Your administrator has not enabled any dashboard widgets yet.
            </p>
          </div>
        ) : (
          <div className={cn(DASHBOARD_GRID_CLASS, 'items-stretch')}>
            {gridWidgets.map((widget) => (
              <DashboardWidgetCard
                key={widget.key}
                widget={widget}
                range={range}
                refreshToken={refreshToken}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
