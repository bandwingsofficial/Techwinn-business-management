/**
 * Dashboard KPI card display helpers: sparkline geometry and comparison text.
 * Run: `node --experimental-strip-types --test scripts/dashboard-kpi-trend.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSparklinePath,
  describeKpiComparison,
  hasKpiTrend,
} from '../src/features/dashboard/utils/kpi-trend.ts';

test('no data means no path: missing, empty, single-point and all-zero series are empty states', () => {
  assert.equal(buildSparklinePath(undefined), null);
  assert.equal(buildSparklinePath(null), null);
  assert.equal(buildSparklinePath([]), null);
  assert.equal(buildSparklinePath([5]), null); // e.g. "Today": one day cannot form a line
  assert.equal(buildSparklinePath([0, 0, 0, 0]), null);
  assert.equal(hasKpiTrend([0, 0]), false);
  assert.equal(hasKpiTrend([0, 1]), true);
});

test('real data yields a path inside the original 100x34 design bounds', () => {
  const path = buildSparklinePath([0, 1, 1, 3]);
  assert.ok(path && path.startsWith('M2 '), 'starts at the left edge x=2');
  const numbers = path.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = numbers.filter((_, i) => i % 2 === 0);
  const ys = numbers.filter((_, i) => i % 2 === 1);
  assert.ok(xs.every((x) => x >= 2 && x <= 98));
  assert.ok(ys.every((y) => y >= 3 && y <= 25));
  assert.ok(path.endsWith('98 3'), 'highest value (last point) ends at the top-right');
});

test('the line follows the data: rising vs falling series end at opposite heights', () => {
  const rising = buildSparklinePath([1, 2, 3, 9]);
  const falling = buildSparklinePath([9, 3, 2, 1]);
  assert.ok(rising.startsWith('M2 25'));
  assert.ok(rising.endsWith('98 3'));
  assert.ok(falling.startsWith('M2 3'));
  assert.ok(falling.endsWith('98 25'));
});

test('a flat non-zero series is drawn as a flat line, not hidden', () => {
  const path = buildSparklinePath([4, 4, 4]);
  assert.ok(path);
  assert.ok(path.endsWith('98 14'));
});

test('comparison text uses the API label and percent, never a hardcoded "last month"', () => {
  assert.deepEqual(
    describeKpiComparison({ deltaPercent: 12, previousValue: 10, comparisonLabel: 'vs. last week' }),
    { deltaText: '+12%', tone: 'up', label: 'vs. last week' },
  );
  assert.deepEqual(
    describeKpiComparison({ deltaPercent: -5, previousValue: 20, comparisonLabel: 'vs. yesterday' }),
    { deltaText: '-5%', tone: 'down', label: 'vs. yesterday' },
  );
  assert.deepEqual(
    describeKpiComparison({ deltaPercent: 0, previousValue: 3, comparisonLabel: 'vs. last year' }),
    { deltaText: '0%', tone: 'flat', label: 'vs. last year' },
  );
});

test('previous value of zero shows the raw value instead of an invented percentage', () => {
  assert.deepEqual(
    describeKpiComparison({ deltaPercent: null, previousValue: 0, comparisonLabel: 'vs. last month' }),
    { deltaText: null, tone: null, label: '0 vs. last month' },
  );
});

test('no comparison period (All time, headcount) shows nothing', () => {
  const empty = { deltaText: null, tone: null, label: null };
  assert.deepEqual(describeKpiComparison({ comparisonLabel: null, previousValue: null, deltaPercent: null }), empty);
  assert.deepEqual(describeKpiComparison({}), empty);
});
