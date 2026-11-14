export function leaveYearDateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

export function formatLeaveYearConfigurationPeriod(yearStart: Date, yearEnd: Date): string {
  return `${yearStart.toISOString().slice(0, 10)} – ${yearEnd.toISOString().slice(0, 10)}`;
}