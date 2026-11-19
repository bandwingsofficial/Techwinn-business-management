import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveDashboardDateRange,
  zonedStartOfDayInstant,
} from '../dist/modules/dashboard/application/dashboard-date-range.js';

// Fixed instant: 2026-11-19 10:00 in Asia/Kolkata (04:30 UTC).
const NOW = new Date('2026-11-19T04:30:00.000Z');
const KOLKATA = 'Asia/Kolkata';

test('org-local midnight is used for timestamp boundaries (Asia/Kolkata)', () => {
  const start = zonedStartOfDayInstant({ year: 2026, month: 11, day: 19 }, KOLKATA);
  assert.equal(start.toISOString(), '2026-11-18T18:30:00.000Z');
});

test('today: only the organization-local day is included', () => {
  const r = resolveDashboardDateRange({ preset: 'today' }, KOLKATA, NOW);
  assert.equal(r.dateFrom.toISOString().slice(0, 10), '2026-11-19');
  assert.equal(r.dateTo.toISOString().slice(0, 10), '2026-11-19');
  assert.equal(r.instantFrom.toISOString(), '2026-11-18T18:30:00.000Z');
  assert.equal(r.instantTo.toISOString(), '2026-11-19T18:30:00.000Z');
});

test('yesterday excludes today and the day before', () => {
  const r = resolveDashboardDateRange({ preset: 'yesterday' }, KOLKATA, NOW);
  assert.equal(r.dateFrom.toISOString().slice(0, 10), '2026-11-18');
  assert.equal(r.dateTo.toISOString().slice(0, 10), '2026-11-18');
  assert.equal(r.instantTo.toISOString(), '2026-11-18T18:30:00.000Z');
});

test('this month starts on the 1st in the organization timezone', () => {
  const r = resolveDashboardDateRange({ preset: 'month' }, KOLKATA, NOW);
  assert.equal(r.dateFrom.toISOString().slice(0, 10), '2026-11-01');
  assert.equal(r.dateTo.toISOString().slice(0, 10), '2026-11-19');
});

test('last month is fully bounded and excludes the current month', () => {
  const r = resolveDashboardDateRange({ preset: 'last_month' }, KOLKATA, NOW);
  assert.equal(r.dateFrom.toISOString().slice(0, 10), '2026-10-01');
  assert.equal(r.dateTo.toISOString().slice(0, 10), '2026-10-31');
  assert.equal(r.instantTo.toISOString(), '2026-10-31T18:30:00.000Z');
});

test('custom range spans month and year boundaries', () => {
  const r = resolveDashboardDateRange(
    { preset: 'custom', from: '2025-12-30', to: '2026-01-02' },
    KOLKATA,
    NOW,
  );
  assert.equal(r.dateFrom.toISOString().slice(0, 10), '2025-12-30');
  assert.equal(r.dateTo.toISOString().slice(0, 10), '2026-01-02');
  assert.equal(r.instantTo.toISOString(), '2026-01-02T18:30:00.000Z');
});

test('invalid or reversed custom ranges fall back to this month', () => {
  const reversed = resolveDashboardDateRange(
    { preset: 'custom', from: '2026-11-10', to: '2026-11-01' },
    KOLKATA,
    NOW,
  );
  assert.equal(reversed.dateFrom.toISOString().slice(0, 10), '2026-11-01');

  const impossible = resolveDashboardDateRange(
    { preset: 'custom', from: '2026-02-31', to: '2026-03-01' },
    KOLKATA,
    NOW,
  );
  assert.equal(impossible.dateFrom.toISOString().slice(0, 10), '2026-11-01');
});

test('all time starts at the epoch and ends today', () => {
  const r = resolveDashboardDateRange({ preset: 'all_time' }, KOLKATA, NOW);
  assert.equal(r.dateFrom.toISOString().slice(0, 10), '1970-01-01');
  assert.equal(r.dateTo.toISOString().slice(0, 10), '2026-11-19');
});
