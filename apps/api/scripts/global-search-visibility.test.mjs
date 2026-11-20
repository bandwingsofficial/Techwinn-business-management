import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canViewOrganizationDailyTasks,
  canViewOwnDailyTasks,
  resolveGlobalSearchCategories,
  resolveGlobalSearchScope,
  PM_DAILY_TASKS_VIEW_ALL_KEY,
  PM_DAILY_TASKS_VIEW_KEY,
} from '../dist/lib/contracts/index.js';

test('employee with view only sees daily tasks category but own-only scope', () => {
  const permissions = new Set([PM_DAILY_TASKS_VIEW_KEY, 'tasks.read']);
  const sessionEmployeeId = 'emp-akshay';
  const categories = resolveGlobalSearchCategories(permissions, false, sessionEmployeeId);
  assert.equal(categories.has('daily_task'), true);
  assert.equal(canViewOrganizationDailyTasks(permissions, false), false);
  assert.equal(canViewOwnDailyTasks(permissions), true);
  const scope = resolveGlobalSearchScope(permissions, false, sessionEmployeeId);
  assert.equal(scope.dailyTasksOwnOnly, true);
});

test('view all grants org daily task search without own-only flag', () => {
  const permissions = new Set([PM_DAILY_TASKS_VIEW_ALL_KEY, PM_DAILY_TASKS_VIEW_KEY]);
  const scope = resolveGlobalSearchScope(permissions, false, 'emp-1');
  assert.equal(scope.dailyTasksOwnOnly, false);
  assert.equal(canViewOrganizationDailyTasks(permissions, false), true);
});

test('no linked employee means no employee-owned categories', () => {
  const permissions = new Set([PM_DAILY_TASKS_VIEW_KEY, 'tasks.read']);
  const categories = resolveGlobalSearchCategories(permissions, false, null);
  assert.equal(categories.has('daily_task'), false);
  assert.equal(categories.has('employee_profile'), false);
});

test('employee directory requires employees.view', () => {
  const categories = resolveGlobalSearchCategories(new Set(['employees.view']), false, null);
  assert.equal(categories.has('employee'), true);
});