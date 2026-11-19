/**
 * Display formatting for the punch-page grace line and late detail.
 * Run: `node --experimental-strip-types --test scripts/attendance-grace-display.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatGracePeriod,
  formatIsoTime12,
  formatLateDuration,
  minutesToLabel,
} from '../src/features/attendance/utils/time.ts';

test('grace period label', () => {
  assert.equal(formatGracePeriod(30), '30 minutes');
  assert.equal(formatGracePeriod(1), '1 minute');
  assert.equal(formatGracePeriod(0), 'No grace period');
});

test('threshold and office labels use 12-hour clock', () => {
  assert.equal(minutesToLabel(9 * 60 + 30), '9:30 AM');
  assert.equal(minutesToLabel(10 * 60), '10:00 AM');
  assert.equal(minutesToLabel(18 * 60), '6:00 PM');
});

test('punch-in time renders in the organization timezone (10:30 IST = 05:00 UTC)', () => {
  assert.equal(formatIsoTime12('2026-11-19T05:00:00.000Z', 'Asia/Kolkata'), '10:30 AM');
  assert.equal(formatIsoTime12(null, 'Asia/Kolkata'), '—');
});

test('late duration is shown exactly as the backend minutes', () => {
  assert.equal(formatLateDuration(1), '1 min');
  assert.equal(formatLateDuration(30), '30 min');
  assert.equal(formatLateDuration(60), '1 hr');
  assert.equal(formatLateDuration(0), 'Not late');
});
