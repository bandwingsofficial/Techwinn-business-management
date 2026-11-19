/**
 * Daily Tasks — manage workflow stages permission is independent of task edit.
 * Run after `pnpm run build`: `node --test scripts/daily-tasks-manage-workflow-permission.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PM_DAILY_TASKS_PERMISSION_KEYS,
  hasPmDailyTaskManageWorkflowPermission,
} from '../dist/lib/contracts/pm-daily-tasks-permissions.js';
import { updateDailyTaskWorkflowStagesRequestSchema } from '../dist/lib/validation/daily-task.schemas.js';

test('PM daily tasks role UI includes Manage Workflow Stages', () => {
  assert.ok(
    PM_DAILY_TASKS_PERMISSION_KEYS.includes('project_management.daily_tasks.manage_workflow'),
  );
});

test('view-only role cannot manage workflow stages', () => {
  const viewOnly = new Set(['project_management.daily_tasks.view']);
  assert.equal(hasPmDailyTaskManageWorkflowPermission(viewOnly), false);
});

test('tasks.update alone does not grant workflow stage management', () => {
  const editOnly = new Set(['project_management.daily_tasks.view', 'tasks.update']);
  assert.equal(hasPmDailyTaskManageWorkflowPermission(editOnly), false);
});

test('explicit manage_workflow permission grants stage management', () => {
  const manager = new Set([
    'project_management.daily_tasks.view',
    'project_management.daily_tasks.manage_workflow',
  ]);
  assert.equal(hasPmDailyTaskManageWorkflowPermission(manager), true);
});

test('legacy daily_tasks.manage_workflow still grants stage management', () => {
  const legacy = new Set(['project_management.daily_tasks.view', 'daily_tasks.manage_workflow']);
  assert.equal(hasPmDailyTaskManageWorkflowPermission(legacy), true);
});

test('workflow stages update allows empty stage list', () => {
  const parsed = updateDailyTaskWorkflowStagesRequestSchema.parse({ stages: [] });
  assert.deepEqual(parsed.stages, []);
});

test('reassignment target must remain in the saved stages', () => {
  const result = updateDailyTaskWorkflowStagesRequestSchema.safeParse({
    stages: [],
    reassignments: [
      {
        fromStageId: '22222222-2222-4222-8222-222222222222',
        toStageId: '11111111-1111-4111-8111-111111111111',
      },
    ],
  });
  assert.equal(result.success, false);
});