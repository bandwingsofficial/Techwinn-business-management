import type { DailyTaskListItem, DailyTaskNoteItem, DailyTaskNotesCardSummary } from '@techwin/contracts';

export function buildNoteCardSummary(
  previous: DailyTaskNotesCardSummary | null,
  note: DailyTaskNoteItem,
): DailyTaskNotesCardSummary {
  const totalCount = (previous?.totalCount ?? 0) + 1;
  const unreadCount =
    note.acknowledgementStatus === 'UNREAD'
      ? (previous?.unreadCount ?? 0) + 1
      : (previous?.unreadCount ?? 0);
  return { totalCount, unreadCount, latest: note };
}

export function patchTaskAfterNoteCreated(
  task: DailyTaskListItem,
  note: DailyTaskNoteItem,
): Partial<DailyTaskListItem> {
  const myTaskNotes = buildNoteCardSummary(task.myTaskNotes, note);
  const orgTaskNotes = task.orgTaskNotes
    ? buildNoteCardSummary(task.orgTaskNotes, note)
    : buildNoteCardSummary(null, note);
  return {
    myTaskNotes,
    orgTaskNotes,
    unreadEmployeeNoteCount: orgTaskNotes.unreadCount,
  };
}

export function patchTaskAfterNoteAcknowledged(
  task: DailyTaskListItem,
  note: DailyTaskNoteItem,
): Partial<DailyTaskListItem> {
  const org = task.orgTaskNotes;
  const unreadCount = Math.max(
    0,
    (org?.unreadCount ?? task.unreadEmployeeNoteCount ?? 0) - 1,
  );
  const orgTaskNotes = org
    ? { totalCount: org.totalCount, unreadCount, latest: note }
    : unreadCount === 0 && (task.unreadEmployeeNoteCount ?? 0) <= 1
      ? null
      : { totalCount: 1, unreadCount, latest: note };
  return {
    orgTaskNotes,
    unreadEmployeeNoteCount: unreadCount,
  };
}
