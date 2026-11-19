/**
 * Late calculation starts AFTER office start + configured grace.
 * Run after `pnpm run build`: `node --test scripts/attendance-late-grace.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateAttendance,
  lateThresholdMinutes,
  resolveAttendanceDayTiming,
} from '../dist/modules/attendance/domain/policies/attendance-status.policy.js';
import {
  resolveOfficeHoursForWeekday,
  getZonedParts,
} from '../dist/modules/attendance/domain/services/attendance-time.service.js';
import {
  snapshotFromJson,
  snapshotToScheduleConfig,
  toScheduleSnapshot,
} from '../dist/modules/attendance/infrastructure/persistence/prisma/mappers/attendance.mapper.js';

const TZ = 'Asia/Kolkata';
const DATE = '2026-11-19'; // Thursday
const START = 9 * 60 + 30; // 9:30 AM
const END = 18 * 60; // 6:00 PM

function schedule(overrides = {}) {
  return {
    scheduleId: 'sched-1',
    timeZone: TZ,
    officeStartMinutes: START,
    officeEndMinutes: END,
    lateGraceMinutes: 30,
    minFullDayMinutes: 480,
    minHalfDayMinutes: 240,
    weeklyOffDays: [0],
    workingDays: [1, 2, 3, 4, 5, 6],
    daySchedules: [],
    earlyPunchInAllowanceMinutes: 0,
    requireRegisteredDevice: false,
    allowPunchOutAfterOfficeEnd: true,
    ipAllowlist: [],
    ...overrides,
  };
}

/** Wall-clock time in Asia/Kolkata (UTC+5:30) on DATE → instant. */
function istInstant(hhmm, seconds = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  const utcMinutes = h * 60 + m - (5 * 60 + 30);
  return new Date(Date.UTC(2026, 10, 19, 0, utcMinutes, seconds));
}

function evaluatePunchIn(hhmm, sched = schedule(), seconds = 0) {
  return evaluateAttendance({
    schedule: sched,
    attendanceDate: DATE,
    punchInAt: istInstant(hhmm, seconds),
    punchOutAt: null,
    officeStartMinutes: START,
    officeEndMinutes: END,
  });
}

test('threshold = office start + configured grace (9:30 + 30 = 10:00)', () => {
  assert.equal(lateThresholdMinutes(START, 30), 10 * 60);
});

for (const [punchIn, expectedLate, expectedStatus] of [
  ['09:30', 0, 'PRESENT'],
  ['09:45', 0, 'PRESENT'],
  ['10:00', 0, 'PRESENT'], // exactly at the effective late start is on time
  ['10:01', 1, 'LATE'],
  ['10:15', 15, 'LATE'],
  ['10:30', 30, 'LATE'],
  ['11:00', 60, 'LATE'],
]) {
  test(`9:30 start + 30 min grace: punch ${punchIn} → late ${expectedLate} (${expectedStatus})`, () => {
    const result = evaluatePunchIn(punchIn);
    assert.equal(result.lateMinutes, expectedLate);
    assert.equal(result.status, expectedStatus);
  });
}

test('seconds within the 10:00 minute do not make the employee late', () => {
  assert.equal(evaluatePunchIn('10:00', schedule(), 59).lateMinutes, 0);
});

test('grace of zero: late starts right after office start', () => {
  const sched = schedule({ lateGraceMinutes: 0 });
  assert.equal(evaluatePunchIn('09:30', sched).lateMinutes, 0);
  assert.equal(evaluatePunchIn('09:31', sched).lateMinutes, 1);
});

test('grace is read from configuration, not hardcoded (45 min → threshold 10:15)', () => {
  const sched = schedule({ lateGraceMinutes: 45 });
  assert.equal(evaluatePunchIn('10:15', sched).lateMinutes, 0);
  assert.equal(evaluatePunchIn('10:16', sched).lateMinutes, 1);
  assert.equal(resolveAttendanceDayTiming(sched, 4).lateThresholdMinutes, 10 * 60 + 15);
});

test('late minutes use the organization timezone, not UTC', () => {
  // 10:30 IST is 05:00 UTC. In UTC the clock reads 05:00 and would look early.
  const instant = istInstant('10:30');
  assert.equal(instant.getUTCHours(), 5);
  assert.equal(getZonedParts(instant, TZ).minutesFromMidnight, 10 * 60 + 30);
  assert.equal(evaluatePunchIn('10:30').lateMinutes, 30);
});

test('response timing matches the values late calculation uses', () => {
  const timing = resolveAttendanceDayTiming(schedule(), 4);
  assert.deepEqual(timing, {
    officeStartMinutes: START,
    officeEndMinutes: END,
    lateGraceMinutes: 30,
    lateThresholdMinutes: 600,
  });
  // On time at the threshold, late one minute after — for every punch the page could show.
  assert.equal(evaluatePunchIn('10:00').lateMinutes, 0);
  assert.equal(evaluatePunchIn('10:01').lateMinutes, 1);
});

test('per-weekday office hours shift the late threshold', () => {
  const sched = schedule({
    daySchedules: [{ day: 6, startMinutes: 10 * 60, endMinutes: 14 * 60 }], // Saturday 10:00
  });
  const saturday = resolveAttendanceDayTiming(sched, 6);
  assert.equal(saturday.officeStartMinutes, 600);
  assert.equal(saturday.lateThresholdMinutes, 630);
  const thursday = resolveAttendanceDayTiming(sched, 4);
  assert.equal(thursday.lateThresholdMinutes, 600);
  assert.deepEqual(resolveOfficeHoursForWeekday(sched, 6), { startMinutes: 600, endMinutes: 840 });
});

test('a record keeps its own snapshot: changing grace later does not change its result', () => {
  const original = schedule({ lateGraceMinutes: 30 });
  const snapshotJson = JSON.parse(JSON.stringify(toScheduleSnapshot(original)));

  // Admin later reduces grace to 5 minutes; a new schedule would apply from a future date.
  const changed = schedule({ lateGraceMinutes: 5 });
  assert.equal(evaluatePunchIn('10:10', changed).lateMinutes, 35); // threshold 9:35

  // The punched day is evaluated and displayed from its snapshot, so it stays on time.
  const fromSnapshot = snapshotToScheduleConfig(snapshotFromJson(snapshotJson));
  assert.equal(fromSnapshot.lateGraceMinutes, 30);
  assert.equal(evaluatePunchIn('10:00', fromSnapshot).lateMinutes, 0);
  assert.equal(resolveAttendanceDayTiming(fromSnapshot, 4).lateThresholdMinutes, 600);
});

test('late minutes do not depend on punch-out, status or half-day rules', () => {
  const withPunchOut = evaluateAttendance({
    schedule: schedule(),
    attendanceDate: DATE,
    punchInAt: istInstant('10:30'),
    punchOutAt: istInstant('18:30'),
    officeStartMinutes: START,
    officeEndMinutes: END,
  });
  assert.equal(withPunchOut.lateMinutes, 30);
  assert.equal(withPunchOut.status, 'LATE');
});
