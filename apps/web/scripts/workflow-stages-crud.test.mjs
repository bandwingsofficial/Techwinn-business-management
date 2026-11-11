/**
 * Run: `node --experimental-strip-types --test scripts/workflow-stages-crud.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { updateDailyTaskWorkflowStagesRequestSchema } from '../src/lib/validation/daily-task.schemas.ts';

test('workflow stages update allows empty stage list', () => {
  const parsed = updateDailyTaskWorkflowStagesRequestSchema.parse({ stages: [] });
  assert.deepEqual(parsed.stages, []);
});

test('workflow stages update accepts delete reassignment to null', () => {
  const parsed = updateDailyTaskWorkflowStagesRequestSchema.parse({
    stages: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        stageKey: 'todo',
        name: 'To Do',
        sortOrder: 1,
        colorToken: 'slate',
        isActive: true,
        isCompletedStage: false,
      },
    ],
    reassignments: [
      {
        fromStageId: '22222222-2222-4222-8222-222222222222',
        toStageId: null,
      },
    ],
  });
  assert.equal(parsed.reassignments?.[0]?.toStageId, null);
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
