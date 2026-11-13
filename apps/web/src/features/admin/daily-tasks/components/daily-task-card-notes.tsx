'use client';

import type { DailyTaskListItem, DailyTaskNoteItem } from '@techwin/contracts';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import {
  canShowDailyTaskAddNoteButton,
  isDailyTaskNotePlatformReviewer,
} from '@techwin/contracts';
import { useIsPlatformSuperAdmin } from '@/features/auth/hooks/use-is-platform-super-admin';
import { DailyTaskNoteDialog } from './daily-task-note-dialog';
import { patchTaskAfterNoteCreated } from '../utils/task-note-summary';

type NoteIndicator = 'none' | 'unread' | 'seen';

function resolveSubmitterIndicator(task: DailyTaskListItem): NoteIndicator {
  const own = task.myTaskNotes;
  const total = own?.totalCount ?? 0;
  if (total === 0) return 'none';
  return (own?.unreadCount ?? 0) > 0 ? 'unread' : 'seen';
}

function resolveReviewerIndicator(task: DailyTaskListItem): NoteIndicator {
  const org = task.orgTaskNotes;
  const total = org?.totalCount ?? 0;
  if (total === 0 && (task.unreadEmployeeNoteCount ?? 0) === 0) return 'none';
  const unread = org?.unreadCount ?? task.unreadEmployeeNoteCount ?? 0;
  if (unread > 0) return 'unread';
  return total > 0 ? 'seen' : 'none';
}

function NoteStatusDot({ state }: { state: NoteIndicator }) {
  if (state === 'none') return null;
  return (
    <span
      className={cn(
        'size-2.5 shrink-0 rounded-full ring-2 ring-background',
        state === 'unread' ? 'bg-rose-600 shadow-[0_0_0_1px_rgb(225_29_72_/_0.35)]' : 'bg-emerald-600',
      )}
      title={state === 'unread' ? 'Not seen by Super Admin' : 'Seen by Super Admin'}
      aria-hidden
    />
  );
}

export function DailyTaskCardNotes({
  task,
  employeeMode,
  onTaskPatched,
}: {
  task: DailyTaskListItem;
  employeeMode: boolean;
  onTaskPatched?: (taskId: string, patch: Partial<DailyTaskListItem>) => void;
}) {
  const isPlatformSuperAdmin = useIsPlatformSuperAdmin();
  const isReviewer = isDailyTaskNotePlatformReviewer(isPlatformSuperAdmin);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const indicator = isReviewer
    ? resolveReviewerIndicator(task)
    : resolveSubmitterIndicator(task);

  const showCreateButton = canShowDailyTaskAddNoteButton(isPlatformSuperAdmin);
  const showViewOnIndicator = indicator !== 'none';

  const onNoteCreated = (note: DailyTaskNoteItem) => {
    const patch = patchTaskAfterNoteCreated(task, note);
    onTaskPatched?.(task.id, patch);
  };

  return (
    <>
      <div
        className="flex min-w-0 shrink-0 items-center justify-end gap-1.5"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {showViewOnIndicator ? (
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted/60"
            title={indicator === 'unread' ? 'Note not seen yet' : 'Note seen'}
            aria-label="View task notes"
            onClick={() => setViewOpen(true)}
          >
            <NoteStatusDot state={indicator} />
          </button>
        ) : null}
        {showCreateButton ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Add a note for Super Admin review"
            className="h-7 shrink-0 gap-1 rounded-lg px-2.5 text-[11px] shadow-xs"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setCreateOpen(true);
            }}
          >
            <MessageSquare className="size-3.5" aria-hidden />
            Add Note
          </Button>
        ) : null}
      </div>
      <DailyTaskNoteDialog
        task={task}
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        employeeMode={employeeMode}
        isReviewer={isReviewer}
        onNoteCreated={onNoteCreated}
      />
      <DailyTaskNoteDialog
        task={task}
        open={viewOpen}
        onOpenChange={setViewOpen}
        mode="view"
        employeeMode={employeeMode}
        isReviewer={isReviewer}
      />
    </>
  );
}
