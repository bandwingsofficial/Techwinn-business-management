/**
 * Dashboard hero KPI cards — date filtering, comparison and trend correctness.
 * Run after `pnpm run build`: `node --test scripts/dashboard-kpi-cards.test.mjs`
 *
 * Drives the compiled DashboardDataService with an in-memory Prisma fake that evaluates the same
 * `where` clauses the real queries send, so every expected number below is derived by hand from
 * the fixture rows (not from the code under test).
 *
 * "Now" is Thursday 2026-11-19 10:00 in Asia/Kolkata (04:30 UTC).
 *   today      2026-11-19            week   2026-11-16 .. 2026-11-19
 *   month      2026-11-01 .. 11-19   year   2026-01-01 .. 2026-11-19
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveDashboardDateRange,
  resolvePreviousDashboardRange,
  trendWindowCoversRange,
} from '../dist/modules/dashboard/application/dashboard-date-range.js';
import {
  bucketTrend,
  buildPeriodKpiMetric,
  computeDeltaPercent,
} from '../dist/modules/dashboard/application/dashboard-kpi-metric.js';
import { DashboardDataService } from '../dist/modules/dashboard/application/services/dashboard-data.service.js';

const ORG = 'org-1';
const TZ = 'Asia/Kolkata';
const NOW = new Date('2026-11-19T04:30:00.000Z');

const ADMIN = { akshay: 'admin-akshay', rahul: 'admin-rahul', manager: 'admin-manager' };

// ── Minimal Prisma `where` evaluator ────────────────────────────────────────

const cmp = (v) => (v instanceof Date ? v.getTime() : v);

function matchesOperator(value, op, arg) {
  switch (op) {
    case 'gte': return value != null && cmp(value) >= cmp(arg);
    case 'gt': return value != null && cmp(value) > cmp(arg);
    case 'lte': return value != null && cmp(value) <= cmp(arg);
    case 'lt': return value != null && cmp(value) < cmp(arg);
    case 'in': return arg.includes(value);
    case 'notIn': return value != null && !arg.includes(value);
    case 'not': return arg === null ? value != null : value !== arg;
    default: throw new Error(`Unsupported operator "${op}"`);
  }
}

function matches(row, where) {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === 'AND') {
      if (!cond.every((w) => matches(row, w))) return false;
      continue;
    }
    if (key === 'OR') {
      if (!cond.some((w) => matches(row, w))) return false;
      continue;
    }
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('some' in cond) {
        if (!(value ?? []).some((child) => matches(child, cond.some))) return false;
        continue;
      }
      for (const [op, arg] of Object.entries(cond)) {
        if (!matchesOperator(value ?? null, op, arg)) return false;
      }
      continue;
    }
    if (cmp(value ?? null) !== cmp(cond)) return false;
  }
  return true;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const at = (iso) => new Date(iso);

const EMPLOYEES = [
  { id: 'emp-akshay', platformAdminId: ADMIN.akshay, dateOfJoining: day('2026-11-19'), employmentStatus: 'ACTIVE', deactivatedAt: null, department: 'Eng' },
  { id: 'emp-rahul', platformAdminId: ADMIN.rahul, dateOfJoining: day('2026-11-10'), employmentStatus: 'ACTIVE', deactivatedAt: null, department: 'Eng' },
  { id: 'emp-john', platformAdminId: 'admin-john', dateOfJoining: day('2026-05-01'), employmentStatus: 'ON_LEAVE', deactivatedAt: null, department: 'Ops' },
  { id: 'emp-old', platformAdminId: 'admin-old', dateOfJoining: day('2024-01-01'), employmentStatus: 'ACTIVE', deactivatedAt: null, department: 'Ops' },
  { id: 'emp-prior', platformAdminId: 'admin-prior', dateOfJoining: day('2025-12-31'), employmentStatus: 'INACTIVE', deactivatedAt: null, department: null },
  // Deactivated: never part of current headcount, even though she "joined" in 2026.
  { id: 'emp-gone', platformAdminId: 'admin-gone', dateOfJoining: day('2026-11-12'), employmentStatus: 'ACTIVE', deactivatedAt: at('2026-11-15T00:00:00Z'), department: 'Ops' },
].map((e) => ({ organizationId: ORG, ...e }));

const task = (id, assignDate, employeeId, extra = {}) => ({
  id,
  organizationId: ORG,
  assignDate: day(assignDate),
  workflowStageId: null,
  dueDate: null,
  assignees: [{ employeeId }],
  updatedAt: at('2026-11-19T00:00:00Z'),
  ...extra,
});

const TASKS = [
  task('t1', '2026-11-19', 'emp-akshay'), // today, not started
  task('t2', '2026-11-19', 'emp-rahul', { workflowStageId: 'stage-done' }), // today, completed
  task('t3', '2026-11-19', 'emp-john', { workflowStageId: 'stage-wip', dueDate: day('2026-11-25') }), // today, in progress
  task('t4', '2026-11-17', 'emp-akshay', { workflowStageId: 'stage-wip', dueDate: day('2026-11-18') }), // 2 days ago, overdue
  task('t9', '2026-11-18', 'emp-akshay', { workflowStageId: 'stage-wip' }), // yesterday, in progress
  task('t5', '2026-11-12', 'emp-rahul'), // last week
  task('t6', '2026-11-02', 'emp-john'), // earlier this month
  task('t7', '2026-10-05', 'emp-akshay'), // last month
  task('t8', '2025-12-20', 'emp-rahul'), // last year, after this year's 'previous' window
  task('t10', '2025-06-01', 'emp-john'), // inside the previous-year window
];

const lead = (id, createdAt, assignedAdminId, extra = {}) => ({
  id,
  organizationId: ORG,
  archivedAt: null,
  assignedAdminId,
  createdAt: at(createdAt),
  convertedAt: null,
  stageId: 'stage-new',
  source: 'WEBSITE',
  ...extra,
});

const LEADS = [
  lead('l1', '2026-11-19T03:00:00Z', ADMIN.akshay), // 08:30 IST today
  lead('l2', '2026-11-18T19:00:00Z', ADMIN.rahul), // 00:30 IST on the 19th -> TODAY in org tz (18th in UTC)
  lead('l3', '2026-11-18T18:00:00Z', ADMIN.akshay), // 23:30 IST on the 18th -> yesterday
  lead('l4', '2026-11-17T06:00:00Z', ADMIN.akshay), // this week
  lead('l5', '2026-11-03T06:00:00Z', ADMIN.rahul), // this month
  lead('l6', '2026-10-10T06:00:00Z', ADMIN.akshay), // last month
  lead('l7', '2025-06-01T06:00:00Z', ADMIN.rahul), // last year
  lead('l8', '2026-11-19T03:30:00Z', ADMIN.akshay, { archivedAt: at('2026-11-19T04:00:00Z') }), // lost: not an active lead
];

const project = (id, createdAt, projectManagerAdminId, taskAssignees = []) => ({
  id,
  organizationId: ORG,
  status: 'ACTIVE',
  createdAt: at(createdAt),
  expectedEndDate: day('2027-01-01'),
  projectManagerAdminId,
  tasks: taskAssignees.map((assigneeAdminId) => ({ assigneeAdminId, status: 'OPEN' })),
});

const PROJECTS = [
  project('p1', '2026-11-19T03:00:00Z', ADMIN.akshay), // today, akshay manages
  project('p2', '2026-11-18T19:00:00Z', ADMIN.manager), // 00:30 IST today
  project('p3', '2026-11-18T05:00:00Z', ADMIN.manager), // yesterday
  project('p4', '2026-11-17T05:00:00Z', ADMIN.manager, [ADMIN.akshay]), // this week; akshay has a task
  project('p5', '2026-11-05T05:00:00Z', ADMIN.manager), // this month
  project('p6', '2026-10-10T05:00:00Z', ADMIN.akshay), // last month
  project('p7', '2025-06-01T05:00:00Z', ADMIN.manager), // last year
];

function createService() {
  const calls = { dailyTask: 0 };
  const groupBy = (rows, by, where) => {
    const groups = new Map();
    for (const row of rows.filter((r) => matches(r, where))) {
      const key = cmp(row[by]);
      const entry = groups.get(key) ?? { [by]: row[by], _count: { _all: 0 } };
      entry._count._all += 1;
      groups.set(key, entry);
    }
    return [...groups.values()];
  };

  const prisma = {
    employee: {
      findFirst: async ({ where }) => EMPLOYEES.find((e) => matches(e, where)) ?? null,
      count: async ({ where }) => EMPLOYEES.filter((e) => matches(e, where)).length,
      findMany: async ({ where }) => EMPLOYEES.filter((e) => matches(e, where)),
      groupBy: async ({ by, where }) => groupBy(EMPLOYEES, by[0], where),
    },
    dailyTaskWorkflowStage: { findMany: async () => [{ id: 'stage-done' }] },
    dailyTask: {
      count: async ({ where }) => {
        calls.dailyTask += 1;
        return TASKS.filter((t) => matches(t, where)).length;
      },
      findMany: async ({ where, take }) =>
        TASKS.filter((t) => matches(t, where))
          .slice(0, take ?? undefined)
          .map((t) => ({ ...t, workflowStage: null, project: null, title: t.id, priority: 'MEDIUM' })),
      groupBy: async ({ by, where }) => groupBy(TASKS, by[0], where),
    },
    pipelineStage: { findMany: async () => [] },
    lead: {
      count: async ({ where }) => LEADS.filter((l) => matches(l, where)).length,
      findMany: async ({ where }) => LEADS.filter((l) => matches(l, where)),
      groupBy: async ({ by, where }) => groupBy(LEADS, by[0], where),
    },
    project: {
      count: async ({ where }) => PROJECTS.filter((p) => matches(p, where)).length,
      findMany: async ({ where }) => PROJECTS.filter((p) => matches(p, where)),
    },
  };
  return { service: new DashboardDataService(prisma), calls };
}

const { service } = createService();
const actorFor = (adminId) => ({ organizationId: ORG, adminId, isPlatformSuperAdmin: false });

async function widget(widgetKey, query, { scope = 'organization', adminId = ADMIN.manager } = {}) {
  const range = resolveDashboardDateRange(query, TZ, NOW);
  return service.loadWidget(actorFor(adminId), widgetKey, scope, range);
}

async function primary(widgetKey, query, options) {
  const data = await widget(widgetKey, query, options);
  const metric = data.kpis.find((m) => m.primary);
  assert.ok(metric, `${widgetKey} has a primary metric`);
  return metric;
}

const PRESETS = {
  today: { preset: 'today' },
  week: { preset: 'week' },
  month: { preset: 'month' },
  year: { preset: 'year' },
  custom: { preset: 'custom', from: '2026-11-17', to: '2026-11-19' },
  all_time: { preset: 'all_time' },
};

/** [value, previousValue, deltaPercent, comparisonLabel] per preset, derived by hand from fixtures. */
function expectMetric(metric, [value, previous, delta, label]) {
  assert.equal(metric.value, value, `value (${metric.label})`);
  assert.equal(metric.previousValue, previous, `previousValue (${metric.label})`);
  assert.equal(metric.deltaPercent, delta, `deltaPercent (${metric.label})`);
  assert.equal(metric.comparisonLabel, label, `comparisonLabel (${metric.label})`);
}

// ── Total Tasks: tasks ASSIGNED in the period ───────────────────────────────

test('Total Tasks (organization scope) follows each preset and compares like-for-like', async () => {
  const expected = {
    today: [3, 1, 200, 'vs. yesterday'],
    week: [5, 1, 400, 'vs. last week'],
    month: [7, 1, 600, 'vs. last month'],
    year: [8, 1, 700, 'vs. last year'],
    custom: [5, 0, null, 'vs. previous period'],
    all_time: [10, null, null, null],
  };
  for (const [name, query] of Object.entries(PRESETS)) {
    expectMetric(await primary('tasks.kpi', query), expected[name]);
  }
});

test('a task assigned on Nov 17 is not counted in Today on Nov 19', async () => {
  const today = await widget('tasks.kpi', PRESETS.today);
  const week = await widget('tasks.kpi', PRESETS.week);
  const total = (data) => data.kpis.find((m) => m.label === 'Total tasks').value;
  assert.equal(total(today), 3);
  assert.equal(total(week), 5);
  // t4 (assigned 11-17, overdue) only appears once the window reaches the 17th.
  assert.equal(today.kpis.find((m) => m.label === 'Overdue').value, 0);
  assert.equal(week.kpis.find((m) => m.label === 'Overdue').value, 1);
});

test('task status rows are an exclusive breakdown: a completed task is never in progress', async () => {
  for (const query of [PRESETS.today, PRESETS.week, PRESETS.month]) {
    const { kpis } = await widget('tasks.kpi', query);
    const get = (label) => kpis.find((m) => m.label === label).value;
    const total = get('Total tasks');
    const statusSum =
      get('Not started') + get('Pending') + get('In progress') + get('Completed') + get('Overdue');
    assert.equal(statusSum, total, `status rows add up to total for ${query.preset}`);
  }
  const today = (await widget('tasks.kpi', PRESETS.today)).kpis;
  const get = (label) => today.find((m) => m.label === label).value;
  assert.equal(get('Completed'), 1); // t2
  assert.equal(get('In progress'), 1); // t3 only — t2 is on the completed stage
  assert.equal(get('Not started'), 1); // t1
});

test('employee scope: Total Tasks counts only the signed-in employee\'s assignments', async () => {
  const opts = { scope: 'assigned', adminId: ADMIN.akshay };
  // Akshay's tasks: t1 (11-19), t9 (11-18), t4 (11-17), t7 (10-05).
  const expected = {
    today: [1, 1, 0, 'vs. yesterday'], // t1 today vs t9 yesterday
    week: [3, 0, null, 'vs. last week'],
    month: [3, 1, 200, 'vs. last month'], // t7 falls in Oct 1..19
    year: [4, 0, null, 'vs. last year'],
    all_time: [4, null, null, null],
  };
  for (const name of ['today', 'week', 'month', 'year', 'all_time']) {
    expectMetric(await primary('tasks.kpi', PRESETS[name], opts), expected[name]);
  }
  // Rahul's own tasks are never in Akshay's number (t2, t5, t8 belong to Rahul).
  const rahul = await primary('tasks.kpi', PRESETS.all_time, { scope: 'assigned', adminId: ADMIN.rahul });
  assert.equal(rahul.value, 3);
});

// ── Total Leads: leads CREATED in the period ────────────────────────────────

test('Total Leads counts leads created in the period, using org-timezone day boundaries', async () => {
  const expected = {
    today: [2, 1, 100, 'vs. yesterday'], // l1 + l2 (00:30 IST on the 19th, still 18th in UTC); l3 is yesterday
    week: [4, 0, null, 'vs. last week'],
    month: [5, 1, 400, 'vs. last month'],
    year: [6, 1, 500, 'vs. last year'],
    custom: [4, 0, null, 'vs. previous period'],
    all_time: [7, null, null, null], // archived (lost) l8 is not an active lead
  };
  for (const [name, query] of Object.entries(PRESETS)) {
    expectMetric(await primary('crm.kpi', query), expected[name]);
  }
});

test('Total Leads respects the assigned scope', async () => {
  const opts = { scope: 'assigned', adminId: ADMIN.akshay };
  expectMetric(await primary('crm.kpi', PRESETS.today, opts), [1, 1, 0, 'vs. yesterday']);
  expectMetric(await primary('crm.kpi', PRESETS.month, opts), [3, 1, 200, 'vs. last month']);
});

test('the all-time lead pipeline is kept as a separate metric, not the period total', async () => {
  const { kpis } = await widget('crm.kpi', PRESETS.today);
  assert.equal(kpis.find((m) => m.label === 'All active leads').value, 7);
  assert.equal(kpis.find((m) => m.primary).value, 2);
});

// ── Total Projects: projects CREATED in the period ──────────────────────────

test('Total Projects counts projects created in the period', async () => {
  const expected = {
    today: [2, 1, 100, 'vs. yesterday'],
    week: [4, 0, null, 'vs. last week'],
    month: [5, 1, 400, 'vs. last month'],
    year: [6, 1, 500, 'vs. last year'],
    custom: [4, 0, null, 'vs. previous period'],
    all_time: [7, null, null, null],
  };
  for (const [name, query] of Object.entries(PRESETS)) {
    expectMetric(await primary('projects.kpi', query), expected[name]);
  }
});

test('Total Projects for an employee only counts projects they manage or have tasks in', async () => {
  const opts = { scope: 'assigned', adminId: ADMIN.akshay };
  expectMetric(await primary('projects.kpi', PRESETS.today, opts), [1, 0, null, 'vs. yesterday']);
  expectMetric(await primary('projects.kpi', PRESETS.week, opts), [2, 0, null, 'vs. last week']); // p1 (manager) + p4 (task)
  expectMetric(await primary('projects.kpi', PRESETS.year, opts), [3, 0, null, 'vs. last year']);
});

// ── Total Employees: CURRENT headcount, joiners reported separately ─────────

test('Total Employees is current headcount for every range; joiners are a separate figure', async () => {
  // emp-gone joined on 11-12 but is deactivated, so she is in neither number.
  // Joined dates: akshay 11-19, rahul 11-10, john 2026-05-01, prior 2025-12-31, old 2024-01-01.
  const joiners = { today: 1, week: 1, month: 2, year: 3, custom: 1, all_time: 5 };
  for (const [name, query] of Object.entries(PRESETS)) {
    const metric = await primary('employees.kpi', query);
    assert.equal(metric.value, 5, `current headcount is unchanged for ${name}`);
    assert.equal(metric.caption, 'Current headcount');
    assert.deepEqual(metric.secondary, { label: 'Joined in period', value: joiners[name] }, name);
    assert.equal(metric.previousValue, null);
    assert.equal(metric.deltaPercent, null);
    assert.equal(metric.comparisonLabel, null);
  }
});

test('employees created in the period are not added to Total Employees', async () => {
  const today = await primary('employees.kpi', PRESETS.today);
  const year = await primary('employees.kpi', PRESETS.year);
  assert.equal(today.value, year.value);
  assert.notEqual(today.secondary.value, year.secondary.value);
});

// ── Sparklines: real data only ──────────────────────────────────────────────

test('trend series come from the same period and add up to the KPI value', async () => {
  const week = await primary('tasks.kpi', PRESETS.week);
  // 11-16, 11-17 (t4), 11-18 (t9), 11-19 (t1, t2, t3)
  assert.deepEqual(week.trend, [0, 1, 1, 3]);
  assert.equal(week.trend.reduce((a, b) => a + b, 0), week.value);

  const leadsWeek = await primary('crm.kpi', PRESETS.week);
  assert.deepEqual(leadsWeek.trend, [0, 1, 1, 2]); // l4 on 17, l3 on 18 (IST), l1 + l2 on 19
  assert.equal(leadsWeek.trend.reduce((a, b) => a + b, 0), leadsWeek.value);

  const projectsWeek = await primary('projects.kpi', PRESETS.week);
  assert.deepEqual(projectsWeek.trend, [0, 1, 1, 2]);

  const employeesWeek = await primary('employees.kpi', PRESETS.week);
  assert.deepEqual(employeesWeek.trend, [0, 0, 0, 1]);

  for (const key of ['tasks.kpi', 'crm.kpi', 'projects.kpi']) {
    const year = await primary(key, PRESETS.year);
    assert.ok(year.trend.length <= 30, 'long ranges are bucketed');
    assert.equal(year.trend.reduce((a, b) => a + b, 0), year.value, `${key} year trend sums to value`);
  }
});

test('Today has a single data point (no fabricated curve)', async () => {
  const metric = await primary('tasks.kpi', PRESETS.today);
  assert.deepEqual(metric.trend, [3]);
});

test('All time and over-long custom ranges omit the trend instead of drawing another period', async () => {
  for (const key of ['tasks.kpi', 'crm.kpi', 'projects.kpi', 'employees.kpi']) {
    const metric = await primary(key, PRESETS.all_time);
    assert.equal(metric.trend, undefined, `${key} all-time has no trend`);
  }
  const range = resolveDashboardDateRange(
    { preset: 'custom', from: '2024-01-01', to: '2026-11-19' },
    TZ,
    NOW,
  );
  assert.equal(trendWindowCoversRange(range), false);
  assert.equal(trendWindowCoversRange(resolveDashboardDateRange(PRESETS.year, TZ, NOW)), true);
});

test('a period with no records returns an empty (all-zero) trend, never invented values', async () => {
  const data = await widget('crm.kpi', { preset: 'custom', from: '2026-01-02', to: '2026-01-08' });
  const metric = data.kpis.find((m) => m.primary);
  assert.equal(metric.value, 0);
  assert.deepEqual(metric.trend, [0, 0, 0, 0, 0, 0, 0]);
});

// ── Previous-period resolution ──────────────────────────────────────────────

const iso = (d) => d.toISOString().slice(0, 10);
function previous(query, now = NOW) {
  const range = resolveDashboardDateRange(query, TZ, now);
  const prev = resolvePreviousDashboardRange(range);
  return prev && { from: iso(prev.dateFrom), to: iso(prev.dateTo), label: prev.comparisonLabel, prev };
}

test('previous range is the like-for-like elapsed part of the previous period', () => {
  const today = previous(PRESETS.today);
  assert.deepEqual([today.from, today.to, today.label], ['2026-11-18', '2026-11-18', 'vs. yesterday']);
  const week = previous(PRESETS.week);
  assert.deepEqual([week.from, week.to, week.label], ['2026-11-09', '2026-11-12', 'vs. last week']);
  const month = previous(PRESETS.month);
  assert.deepEqual([month.from, month.to, month.label], ['2026-10-01', '2026-10-19', 'vs. last month']);
  const year = previous(PRESETS.year);
  assert.deepEqual([year.from, year.to, year.label], ['2025-01-01', '2025-11-19', 'vs. last year']);
  const custom = previous(PRESETS.custom);
  assert.deepEqual([custom.from, custom.to, custom.label], ['2026-11-14', '2026-11-16', 'vs. previous period']);
  const lastMonth = previous({ preset: 'last_month' });
  assert.deepEqual([lastMonth.from, lastMonth.to], ['2026-09-01', '2026-09-30']);
  const quarter = previous({ preset: 'quarter' });
  // Q4 so far is Oct 1..Nov 19 (50 days) -> the first 50 days of Q3.
  assert.deepEqual([quarter.from, quarter.to, quarter.label], ['2026-07-01', '2026-08-19', 'vs. last quarter']);
  assert.equal(previous(PRESETS.all_time), null);
});

test('previous range is clamped to the previous period and uses org-local boundaries', () => {
  // March 31 -> compare with February 1..28 (not into March).
  const mar31 = previous({ preset: 'month' }, new Date('2026-03-31T04:30:00.000Z'));
  assert.deepEqual([mar31.from, mar31.to], ['2026-02-01', '2026-02-28']);
  // Feb 29 2028 year-to-date -> 2027-01-01 .. 2027-02-28.
  const leap = previous({ preset: 'year' }, new Date('2028-02-29T04:30:00.000Z'));
  assert.deepEqual([leap.from, leap.to], ['2027-01-01', '2027-02-28']);
  // Timestamp boundaries are org-local midnights (IST = UTC+5:30).
  const today = previous(PRESETS.today).prev;
  assert.equal(today.instantFrom.toISOString(), '2026-11-17T18:30:00.000Z');
  assert.equal(today.instantTo.toISOString(), '2026-11-18T18:30:00.000Z');
});

// ── Metric helpers ──────────────────────────────────────────────────────────

test('delta is null instead of invented when the previous value is zero', () => {
  assert.equal(computeDeltaPercent(5, 0), null);
  assert.equal(computeDeltaPercent(0, 0), null);
  assert.equal(computeDeltaPercent(150, 100), 50);
  assert.equal(computeDeltaPercent(50, 100), -50);
});

test('bucketTrend preserves totals and caps the number of points', () => {
  const daily = Array.from({ length: 366 }, (_, i) => (i % 7 === 0 ? 3 : 0));
  const buckets = bucketTrend(daily);
  assert.ok(buckets.length <= 30);
  assert.equal(buckets.reduce((a, b) => a + b, 0), daily.reduce((a, b) => a + b, 0));
  assert.deepEqual(bucketTrend([1, 2, 3]), [1, 2, 3]);
});

test('buildPeriodKpiMetric attaches trend/comparison only when real data was supplied', () => {
  const bare = buildPeriodKpiMetric({ label: 'X', value: 4, caption: 'c', comparison: null });
  assert.equal(bare.trend, undefined);
  assert.equal(bare.comparisonLabel, null);
  assert.equal(bare.deltaPercent, null);
});

// ── Refreshing returns fresh data (no server-side memoisation) ──────────────

test('repeated loads re-query the database (no stale cached KPI values)', async () => {
  const { service: fresh, calls } = createService();
  const range = resolveDashboardDateRange(PRESETS.today, TZ, NOW);
  await fresh.loadWidget(actorFor(ADMIN.manager), 'tasks.kpi', 'organization', range);
  const first = calls.dailyTask;
  await fresh.loadWidget(actorFor(ADMIN.manager), 'tasks.kpi', 'organization', range);
  assert.ok(calls.dailyTask >= first * 2, 'second load hit the database again');
});
