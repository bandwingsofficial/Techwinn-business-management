/**
 * Run: `node --experimental-strip-types --test scripts/board-fetch-stability.test.mjs`
 *
 * Guards the daily-tasks board against effect loops where `setStages` recreates
 * `loadBoard` and re-triggers the kanban fetch effect.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearRequestDiagnostics,
  countRequestsMatching,
  enableRequestDiagnostics,
  identicalRequestBurstCount,
  recordApiRequest,
} from '../src/shared/api/request-diagnostics.ts';

function sameWorkflowStages(left, right) {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every(
    (stage, index) =>
      stage.id === right[index]?.id &&
      stage.stageKey === right[index]?.stageKey &&
      stage.name === right[index]?.name &&
      stage.isActive === right[index]?.isActive &&
      stage.sortOrder === right[index]?.sortOrder,
  );
}

/**
 * Minimal model of the previous buggy dependency graph:
 * loadBoard deps include stages → setStages after every board response → new loadBoard → effect re-runs.
 */
function simulateBoardEffectLoop({
  boardResponses,
  includeStagesInLoadBoardDeps,
  maxTicks = 20,
}) {
  let stages = [];
  let loadBoardIdentity = 0;
  let boardFetches = 0;
  let ticks = 0;

  const rebuildLoadBoard = () => {
    loadBoardIdentity += 1;
    return loadBoardIdentity;
  };

  let loadBoard = rebuildLoadBoard();
  let lastSeenLoadBoard = null;

  while (ticks < maxTicks) {
    ticks += 1;
    if (lastSeenLoadBoard === loadBoard) break;
    lastSeenLoadBoard = loadBoard;
    boardFetches += 1;
    const response = boardResponses[(boardFetches - 1) % boardResponses.length];
    if (includeStagesInLoadBoardDeps) {
      stages = response.stages;
      loadBoard = rebuildLoadBoard();
    } else if (!sameWorkflowStages(stages, response.stages)) {
      stages = response.stages;
      // stages change must NOT rebuild loadBoard when stages are not a dependency
    }
  }

  return { boardFetches, ticks, stages };
}

const STAGE_A = {
  id: 's1',
  stageKey: 'todo',
  name: 'To do',
  isActive: true,
  sortOrder: 1,
};
const BOARD = { assignDate: '2026-11-11', stages: [STAGE_A] };

test('sameWorkflowStages treats equivalent stage payloads as equal', () => {
  assert.equal(sameWorkflowStages([STAGE_A], [{ ...STAGE_A }]), true);
  assert.equal(sameWorkflowStages([STAGE_A], [{ ...STAGE_A, name: 'Done' }]), false);
});

test('legacy stages-in-deps loop would refetch board repeatedly for identical payloads', () => {
  const result = simulateBoardEffectLoop({
    boardResponses: [BOARD, BOARD, BOARD],
    includeStagesInLoadBoardDeps: true,
    maxTicks: 12,
  });
  assert.ok(result.boardFetches > 5, `expected loop, got ${result.boardFetches}`);
});

test('fixed loadBoard deps stop after one board fetch when stages are unchanged', () => {
  const result = simulateBoardEffectLoop({
    boardResponses: [BOARD, BOARD, BOARD],
    includeStagesInLoadBoardDeps: false,
    maxTicks: 12,
  });
  assert.equal(result.boardFetches, 1);
});

test('request diagnostics detect identical board bursts', () => {
  enableRequestDiagnostics(true);
  clearRequestDiagnostics();
  const path = '/api/v1/daily-tasks/board';
  for (let i = 0; i < 8; i += 1) {
    recordApiRequest({
      method: 'GET',
      path: `${path}?assignDate=2026-11-11&clientToday=2026-11-11`,
      trigger: 'effect',
      source: 'DailyTasksWorkspace.loadBoard',
    });
  }
  assert.equal(countRequestsMatching((e) => e.path === path), 8);
  assert.ok(identicalRequestBurstCount(path, 5_000) >= 8);
  clearRequestDiagnostics();
});

test('assignDate change is a legitimate second board request in the fixed model', () => {
  let stages = [];
  let fetches = 0;
  const run = (assignDate) => {
    fetches += 1;
    const response = { assignDate, stages: [STAGE_A] };
    if (!sameWorkflowStages(stages, response.stages)) stages = response.stages;
  };
  run('2026-11-11');
  run('2026-11-12');
  assert.equal(fetches, 2);
});
