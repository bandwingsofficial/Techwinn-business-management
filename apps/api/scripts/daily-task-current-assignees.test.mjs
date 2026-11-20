import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrentDailyTaskAssigneeNames,
  sortCurrentDailyTaskAssigneeRows,
} from '../dist/lib/persistence/daily-task-current-assignees.js';

test('historical assignee rows never appear as current names', () => {
  const rows = [
    {
      employeeId: null,
      historicalDisplayName: 'Sachin E',
      employee: null,
      createdAt: new Date('2026-01-01'),
    },
    {
      employeeId: 'akshay-id',
      historicalDisplayName: '',
      employee: { displayName: 'Akshay' },
      createdAt: new Date('2026-02-01'),
    },
  ];
  assert.equal(formatCurrentDailyTaskAssigneeNames(rows), 'Akshay');
  assert.equal(sortCurrentDailyTaskAssigneeRows(rows).length, 1);
});

test('multiple current assignees are ordered and joined', () => {
  const rows = [
    {
      employeeId: 'b',
      employee: { displayName: 'Sachin E' },
      createdAt: new Date('2026-03-02'),
    },
    {
      employeeId: 'a',
      employee: { displayName: 'Akshay' },
      createdAt: new Date('2026-03-01'),
    },
  ];
  assert.equal(formatCurrentDailyTaskAssigneeNames(rows), 'Akshay, Sachin E');
});