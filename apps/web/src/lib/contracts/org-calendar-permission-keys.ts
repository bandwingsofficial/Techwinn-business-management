import type { PermissionKey } from './permissions';

export const ORG_CALENDAR_VIEW: PermissionKey = 'organisation_calendar.view';
export const ORG_CALENDAR_VIEW_ALL: PermissionKey = 'organisation_calendar.view_all';
export const ORG_CALENDAR_CREATE: PermissionKey = 'organisation_calendar.create';
export const ORG_CALENDAR_UPDATE: PermissionKey = 'organisation_calendar.update';
export const ORG_CALENDAR_DELETE: PermissionKey = 'organisation_calendar.delete';
export const ORG_CALENDAR_MANAGE_WORKING_DAYS: PermissionKey = 'organisation_calendar.manage_working_days';
export const ORG_CALENDAR_MANAGE_HOLIDAYS: PermissionKey = 'organisation_calendar.manage_holidays';
export const ORG_CALENDAR_EXPORT: PermissionKey = 'organisation_calendar.export';

/** DB / check-time aliases only — not shown in the role hierarchy. */
export const LEGACY_ORG_CALENDAR_PERMISSION_KEYS = [
  'calendar.view',
  'calendar.view_all',
  'calendar.create',
  'calendar.update',
  'calendar.delete',
  'calendar.manage_working_days',
  'calendar.manage_holidays',
  'calendar.export',
] as const satisfies readonly PermissionKey[];

export const ORG_CALENDAR_PERMISSION_KEYS = [
  ORG_CALENDAR_VIEW,
  ORG_CALENDAR_VIEW_ALL,
  ORG_CALENDAR_CREATE,
  ORG_CALENDAR_UPDATE,
  ORG_CALENDAR_DELETE,
  ORG_CALENDAR_MANAGE_WORKING_DAYS,
  ORG_CALENDAR_MANAGE_HOLIDAYS,
  ORG_CALENDAR_EXPORT,
] as const satisfies readonly PermissionKey[];

/** Pre-rename keys accepted during permission checks only. */
const LEGACY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  [ORG_CALENDAR_VIEW]: ['calendar.view'],
  [ORG_CALENDAR_VIEW_ALL]: ['calendar.view_all'],
  [ORG_CALENDAR_CREATE]: ['calendar.create'],
  [ORG_CALENDAR_UPDATE]: ['calendar.update'],
  [ORG_CALENDAR_DELETE]: ['calendar.delete'],
  [ORG_CALENDAR_MANAGE_WORKING_DAYS]: ['calendar.manage_working_days'],
  [ORG_CALENDAR_MANAGE_HOLIDAYS]: ['calendar.manage_holidays'],
  [ORG_CALENDAR_EXPORT]: ['calendar.export'],
};

const LEGACY_TO_CANONICAL = new Map<string, PermissionKey>();
for (const [canonical, legacyKeys] of Object.entries(LEGACY_ALIASES)) {
  for (const legacy of legacyKeys) {
    LEGACY_TO_CANONICAL.set(legacy, canonical as PermissionKey);
  }
}

/** Backfill canonical organisation calendar keys from legacy `calendar.*` role grants. */
export function expandLegacyOrgCalendarPermissions(keys: Set<PermissionKey>): void {
  for (const [legacy, canonical] of LEGACY_TO_CANONICAL) {
    if (keys.has(legacy as PermissionKey)) keys.add(canonical);
  }
}

export function hasOrgCalendarPermission(
  effective: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  if (effective.has(key)) return true;
  for (const legacy of LEGACY_ALIASES[key] ?? []) {
    if (effective.has(legacy as PermissionKey)) return true;
  }
  return false;
}