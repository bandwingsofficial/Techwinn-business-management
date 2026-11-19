import type { DashboardDateRangePreset } from '#contracts';
import { getZonedParts } from '../../attendance/domain/services/attendance-time.service.js';

export type DashboardDateRangeQuery = {
  readonly preset: DashboardDateRangePreset;
  /** `YYYY-MM-DD` calendar date in the organization timezone (custom preset only). */
  readonly from?: string;
  /** `YYYY-MM-DD` calendar date in the organization timezone (custom preset only). */
  readonly to?: string;
};

type CalendarDate = { readonly year: number; readonly month: number; readonly day: number };

export type ResolvedDashboardDateRange = {
  readonly preset: DashboardDateRangePreset;
  /** Organization-local start-of-day instant (inclusive) for `timestamptz` fields. */
  readonly instantFrom: Date;
  /** Organization-local start of the day after the range (exclusive) for `timestamptz` fields. */
  readonly instantTo: Date;
  /** UTC-midnight date (inclusive) for `@db.Date` fields. */
  readonly dateFrom: Date;
  /** UTC-midnight date (inclusive) for `@db.Date` fields. */
  readonly dateTo: Date;
  /** Organization-local "today" as a UTC-midnight date, for overdue / due-today comparisons. */
  readonly orgToday: Date;
  /** Organization timezone used to resolve the boundaries above. */
  readonly timeZone: string;
};

/** Daily trend series never exceed this many days; longer ranges show the most recent days. */
export const DASHBOARD_TREND_MAX_DAYS = 366;

/** `YYYY-MM-DD` org-local calendar key for an instant (e.g. a `completedAt` timestamp). */
export function orgLocalDayKey(instant: Date, timeZone: string): string {
  const parts = getZonedParts(instant, timeZone);
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${parts.year}-${m}-${d}`;
}

/**
 * True when the daily trend window spans the whole range. Ranges longer than the cap (e.g. All
 * time) would only show their trailing days, so KPI sparklines are omitted for them rather than
 * drawn for a different period than the KPI value.
 */
export function trendWindowCoversRange(range: ResolvedDashboardDateRange): boolean {
  const first = trendDaysForRange(range)[0];
  return first !== undefined && first.getTime() === range.dateFrom.getTime();
}

/** Trailing UTC-midnight days (inclusive) for a daily trend, capped at DASHBOARD_TREND_MAX_DAYS. */
export function trendDaysForRange(range: ResolvedDashboardDateRange): Date[] {
  const days: Date[] = [];
  const end = range.dateTo.getTime();
  let cursor = range.dateFrom.getTime();
  const earliest = end - (DASHBOARD_TREND_MAX_DAYS - 1) * DAY_MS;
  if (cursor < earliest) cursor = earliest;
  for (; cursor <= end; cursor += DAY_MS) {
    days.push(new Date(cursor));
  }
  return days;
}

/** Org-local start instant of a UTC-midnight calendar day. */
export function dayStartInstant(day: Date, timeZone: string): Date {
  return zonedStartOfDayInstant(
    { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() },
    timeZone,
  );
}

const DAY_MS = 86_400_000;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** UTC-midnight `Date` representing a calendar day (for `@db.Date` columns). */
export function calendarDayToUtcDate(day: CalendarDate): Date {
  return new Date(Date.UTC(day.year, day.month - 1, day.day));
}

/** Calendar key `YYYY-MM-DD` for a UTC-midnight date value. */
export function utcDateToCalendarKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Instant of local midnight for `day` in `timeZone`.
 * Uses the zone's wall-clock offset at that moment, so it is correct for fixed-offset and DST zones.
 */
export function zonedStartOfDayInstant(day: CalendarDate, timeZone: string): Date {
  const guess = Date.UTC(day.year, day.month - 1, day.day);
  const wall = getZonedParts(new Date(guess), timeZone);
  const wallAsUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    Math.floor(wall.minutesFromMidnight / 60),
    wall.minutesFromMidnight % 60,
  );
  const offsetMs = wallAsUtc - guess;
  return new Date(guess - offsetMs);
}

function addCalendarDays(day: CalendarDate, delta: number): CalendarDate {
  const d = new Date(Date.UTC(day.year, day.month - 1, day.day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function startOfWeekMonday(today: CalendarDate, weekday: number): CalendarDate {
  // `weekday` is 0 (Sun) .. 6 (Sat) from getZonedParts.
  const offset = (weekday + 6) % 7;
  return addCalendarDays(today, -offset);
}

function parseIsoCalendarDate(value: string | undefined): CalendarDate | null {
  if (!value || !CALENDAR_DATE_PATTERN.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(y, m - 1, d));
  // Reject impossible dates such as 2026-02-31.
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return { year: y, month: m, day: d };
}

function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

function buildRange(
  preset: DashboardDateRangePreset,
  start: CalendarDate,
  end: CalendarDate,
  today: CalendarDate,
  timeZone: string,
): ResolvedDashboardDateRange {
  const exclusiveEnd = addCalendarDays(end, 1);
  return {
    preset,
    instantFrom: zonedStartOfDayInstant(start, timeZone),
    instantTo: zonedStartOfDayInstant(exclusiveEnd, timeZone),
    dateFrom: calendarDayToUtcDate(start),
    dateTo: calendarDayToUtcDate(end),
    orgToday: calendarDayToUtcDate(today),
    timeZone,
  };
}

/** The window a KPI is compared against, with a label describing it (e.g. "vs. last week"). */
export type PreviousDashboardDateRange = ResolvedDashboardDateRange & {
  readonly comparisonLabel: string;
};

function utcDateToCalendarDate(value: Date): CalendarDate {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

function daysBetween(a: CalendarDate, b: CalendarDate): number {
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS,
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addCalendarMonths(day: CalendarDate, delta: number): CalendarDate {
  const index = day.year * 12 + (day.month - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { year, month, day: Math.min(day.day, daysInMonth(year, month)) };
}

function minCalendarDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return compareCalendarDates(a, b) <= 0 ? a : b;
}

/**
 * Like-for-like comparison window for a resolved range, or null when there is none.
 *
 * - today / yesterday compare with the day before.
 * - week / month / quarter / year compare the elapsed part of the period with the same elapsed
 *   part of the previous week / month / quarter / year (clamped to that period's length), so a
 *   half-finished month is never compared with a whole month.
 * - last_month compares with the full month before it.
 * - custom compares with the equally long window immediately before it.
 * - all_time has no previous window.
 */
export function resolvePreviousDashboardRange(
  range: ResolvedDashboardDateRange,
): PreviousDashboardDateRange | null {
  const start = utcDateToCalendarDate(range.dateFrom);
  const end = utcDateToCalendarDate(range.dateTo);
  const today = utcDateToCalendarDate(range.orgToday);
  const length = daysBetween(start, end) + 1;

  let prevStart: CalendarDate;
  let prevEnd: CalendarDate;
  let comparisonLabel: string;

  switch (range.preset) {
    case 'all_time':
      return null;
    case 'today':
      prevStart = prevEnd = addCalendarDays(start, -1);
      comparisonLabel = 'vs. yesterday';
      break;
    case 'yesterday':
      prevStart = prevEnd = addCalendarDays(start, -1);
      comparisonLabel = 'vs. the day before';
      break;
    case 'week':
      prevStart = addCalendarDays(start, -7);
      prevEnd = addCalendarDays(prevStart, length - 1);
      comparisonLabel = 'vs. last week';
      break;
    case 'month':
    case 'last_month': {
      prevStart = addCalendarMonths({ ...start, day: 1 }, -1);
      const prevMonthEnd: CalendarDate = {
        ...prevStart,
        day: daysInMonth(prevStart.year, prevStart.month),
      };
      prevEnd =
        range.preset === 'last_month'
          ? prevMonthEnd
          : minCalendarDate(addCalendarDays(prevStart, length - 1), prevMonthEnd);
      comparisonLabel = range.preset === 'last_month' ? 'vs. the month before' : 'vs. last month';
      break;
    }
    case 'quarter': {
      prevStart = addCalendarMonths(start, -3);
      const prevQuarterEnd = addCalendarDays(start, -1);
      prevEnd = minCalendarDate(addCalendarDays(prevStart, length - 1), prevQuarterEnd);
      comparisonLabel = 'vs. last quarter';
      break;
    }
    case 'year': {
      prevStart = { year: start.year - 1, month: 1, day: 1 };
      prevEnd = {
        year: end.year - 1,
        month: end.month,
        day: Math.min(end.day, daysInMonth(end.year - 1, end.month)),
      };
      comparisonLabel = 'vs. last year';
      break;
    }
    default:
      prevEnd = addCalendarDays(start, -1);
      prevStart = addCalendarDays(prevEnd, -(length - 1));
      comparisonLabel = 'vs. previous period';
      break;
  }

  const built = buildRange(range.preset, prevStart, prevEnd, today, range.timeZone);
  return { ...built, comparisonLabel };
}

/**
 * Resolve a dashboard reporting window in the organization's timezone.
 *
 * - `instantFrom` (inclusive) / `instantTo` (exclusive) bound timestamp fields.
 * - `dateFrom` / `dateTo` (both inclusive) bound `@db.Date` fields.
 * - `custom` takes `YYYY-MM-DD` values interpreted in the organization timezone.
 *   Invalid or reversed custom ranges fall back to This month.
 */
export function resolveDashboardDateRange(
  query: DashboardDateRangeQuery,
  timeZone: string,
  now: Date = new Date(),
): ResolvedDashboardDateRange {
  const zonedNow = getZonedParts(now, timeZone);
  const today: CalendarDate = { year: zonedNow.year, month: zonedNow.month, day: zonedNow.day };
  const firstOfThisMonth: CalendarDate = { ...today, day: 1 };

  switch (query.preset) {
    case 'today':
      return buildRange('today', today, today, today, timeZone);
    case 'yesterday': {
      const y = addCalendarDays(today, -1);
      return buildRange('yesterday', y, y, today, timeZone);
    }
    case 'week':
      return buildRange('week', startOfWeekMonday(today, zonedNow.weekday), today, today, timeZone);
    case 'month':
      return buildRange('month', firstOfThisMonth, today, today, timeZone);
    case 'last_month': {
      const lastMonthEnd = addCalendarDays(firstOfThisMonth, -1);
      const lastMonthStart: CalendarDate = { ...lastMonthEnd, day: 1 };
      return buildRange('last_month', lastMonthStart, lastMonthEnd, today, timeZone);
    }
    case 'quarter': {
      const quarterStartMonth = Math.floor((zonedNow.month - 1) / 3) * 3 + 1;
      return buildRange(
        'quarter',
        { year: today.year, month: quarterStartMonth, day: 1 },
        today,
        today,
        timeZone,
      );
    }
    case 'year':
      return buildRange('year', { year: today.year, month: 1, day: 1 }, today, today, timeZone);
    case 'all_time':
      return buildRange('all_time', { year: 1970, month: 1, day: 1 }, today, today, timeZone);
    case 'custom': {
      const start = parseIsoCalendarDate(query.from);
      const end = parseIsoCalendarDate(query.to);
      if (start && end && compareCalendarDates(start, end) <= 0) {
        return buildRange('custom', start, end, today, timeZone);
      }
      return buildRange('month', firstOfThisMonth, today, today, timeZone);
    }
    default:
      return buildRange('month', firstOfThisMonth, today, today, timeZone);
  }
}
