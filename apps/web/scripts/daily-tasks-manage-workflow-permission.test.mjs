/**
 * Run: `node --experimental-strip-types --test scripts/daily-tasks-manage-workflow-permission.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PM_DAILY_TASKS_PERMISSION_KEYS,
  hasPmDailyTaskManageWorkflowPermission,
} from '../src/lib/contracts/pm-daily-tasks-permissions.ts';

test('eight PM daily task permissions are exposed to the role editor', () => {
  assert.equal(PM_DAILY_TASKS_PERMISSION_KEYS.length, 8);
  assert.ok(
    PM_DAILY_TASKS_PERMISSION_KEYS.includes('project_management.daily_tasks.manage_workflow'),
  );
  assert.ok(PM_DAILY_TASKS_PERMISSION_KEYS.includes('project_management.daily_tasks.view_all'));
});

test('hasPmDailyTaskManageWorkflowPermission matches UI gate expectations', () => {
  assert.equal(
    hasPmDailyTaskManageWorkflowPermission(new Set(['project_management.daily_tasks.view'])),
    false,
  );
  assert.equal(
    hasPmDailyTaskManageWorkflowPermission(
      new Set(['project_management.daily_tasks.view', 'project_management.daily_tasks.edit']),
    ),
    false,
  );
  assert.equal(
    hasPmDailyTaskManageWorkflowPermission(
      new Set(['project_management.daily_tasks.manage_workflow']),
    ),
    true,
  );
});