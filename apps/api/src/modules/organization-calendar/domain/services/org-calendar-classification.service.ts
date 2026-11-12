import type { OrgCalendarDayKind, OrgCalendarEventType } from '#contracts';
import { ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES } from '../policies/org-calendar-classification-events.policy.js';
import type { OrgCalendarEventRecord } from '../types/org-calendar.types.js';

const HOLIDAY_TYPES: ReadonlySet<OrgCalendarEventType> = new Set([
  'PUBLIC_HOLIDAY',
  'COMPANY_HOLIDAY',
  'FESTIVAL_REGIONAL',
  'OFFICE_CLOSURE',
  'OPTIONAL_HOLIDAY',
]);

export type ScheduleDayFlags = {
  readonly scheduleWeeklyOff: boolean;
  readonly scheduleNonWorking: boolean;
};

export function resolveScheduleDayFlags(
  weeklyOffDays: readonly number[],
  workingDays: readonly number[],
  weekday: number,
): ScheduleDayFlags {
  if (weeklyOffDays.includes(weekday)) {
    return { scheduleWeeklyOff: true, scheduleNonWorking: false };
  }
  if (workingDays.length > 0 && !workingDays.includes(weekday)) {
    return { scheduleWeeklyOff: false, scheduleNonWorking: true };
  }
  return { scheduleWeeklyOff: false, scheduleNonWorking: false };
}

export function eventAppliesToEmployee(
  event: OrgCalendarEventRecord,
  employeeId?: string,
): boolean {
  if (event.appliesToAllEmployees) return true;
  if (!employeeId) return true;
  return event.employeeIds.includes(employeeId);
}

export function eventsOnDate(
  events: readonly OrgCalendarEventRecord[],
  dateKey: string,
): OrgCalendarEventRecord[] {
  return events.filter((e) => e.isActive && e.startDate <= dateKey && e.endDate >= dateKey);
}

/**
 * Effective day status precedence:
 * 1. Explicit date override (special / half working)
 * 2. Holiday / office-closure configuration
 * 3. Explicit weekly-off event
 * 4. Organisation weekly schedule
 * 5. Default working day
 */
export function classifyDayFromEvents(
  dateEvents: readonly OrgCalendarEventRecord[],
  schedule: ScheduleDayFlags,
): OrgCalendarDayKind {
  const active = dateEvents.filter((e) => e.isActive);
  if (active.some((e) => e.eventType === 'SPECIAL_WORKING_DAY')) return 'SPECIAL_WORKING';
  if (active.some((e) => e.eventType === 'HALF_WORKING_DAY')) return 'HALF_DAY';
  if (active.some((e) => e.eventType === 'OFFICE_CLOSURE')) return 'OFFICE_CLOSURE';
  if (active.some((e) => HOLIDAY_TYPES.has(e.eventType))) return 'HOLIDAY';
  if (active.some((e) => e.eventType === 'WEEKLY_OFF')) return 'WEEKLY_OFF';
  if (schedule.scheduleWeeklyOff) return 'WEEKLY_OFF';
  if (schedule.scheduleNonWorking) return 'NON_WORKING';
  return 'WORKING';
}

export function toAttendanceDayKind(
  kind: OrgCalendarDayKind,
): 'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY' {
  if (kind === 'SPECIAL_WORKING' || kind === 'HALF_DAY') return 'WORKING';
  if (kind === 'HOLIDAY' || kind === 'OFFICE_CLOSURE') return 'HOLIDAY';
  if (kind === 'WEEKLY_OFF' || kind === 'NON_WORKING') return 'WEEKLY_OFF';
  return 'WORKING';
}

export function isNonWorkingForAbsent(kind: OrgCalendarDayKind): boolean {
  return toAttendanceDayKind(kind) !== 'WORKING';
}

export function isHolidayEventType(type: OrgCalendarEventType): boolean {
  return HOLIDAY_TYPES.has(type) || type === 'WEEKLY_OFF' || type === 'OFFICE_CLOSURE';
}

/**
 * Events returned with a day after effective status is resolved.
 * Superseded classification peers are dropped so clients cannot render a second status.
 * The single matching override (e.g. SPECIAL_WORKING_DAY) is kept for the manage dialog;
 * calendar cells must still hide status-override titles and show only `dayKind`.
 */
export function presentationEventsForDay(
  dayKind: OrgCalendarDayKind,
  dateEvents: readonly OrgCalendarEventRecord[],
): OrgCalendarEventRecord[] {
  return dateEvents.filter((event) => {
    if (!event.isActive) return false;
    const isClassification = ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES.includes(event.eventType);
    if (!isClassification) return true;

    if (dayKind === 'SPECIAL_WORKING') return event.eventType === 'SPECIAL_WORKING_DAY';
    if (dayKind === 'HALF_DAY') return event.eventType === 'HALF_WORKING_DAY';
    if (dayKind === 'WEEKLY_OFF') return false;
    if (dayKind === 'HOLIDAY' || dayKind === 'OFFICE_CLOSURE') {
      return HOLIDAY_TYPES.has(event.eventType) || event.eventType === 'OFFICE_CLOSURE';
    }
    return false;
  });
}
