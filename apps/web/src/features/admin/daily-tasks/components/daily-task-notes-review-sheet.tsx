'use client';

import type { DailyTaskNoteInboxItem, DailyTaskNoteInboxStatus, DailyTaskListItem } from '@techwin/contracts';
import { Loader2, MessageSquareText } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminToast } from '@/features/admin/components/toast';
import { isApiError } from '@/shared/api/api-error';
import { acknowledgeDailyTaskNote, fetchDailyTaskNotesInbox } from '../api/daily-tasks';
import { cn } from '@/shared/lib/utils';

const FILTERS: { id: DailyTaskNoteInboxStatus; label: string }[] = [
  { id: 'ALL', label: 'All Notes' },
  { id: 'UNREAD', label: 'Not Seen' },
  { id: 'ACKNOWLEDGED', label: 'Seen' },
];

export function DailyTaskNotesReviewSheet({
  open,
  onOpenChange,
  onNoteAcknowledged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteAcknowledged?: (taskId: string, note: DailyTaskNoteInboxItem) => void;
}) {
  const toast = useAdminToast();
  const [filter, setFilter] = useState<DailyTaskNoteInboxStatus>('UNREAD');
  const [items, setItems] = useState<readonly DailyTaskNoteInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchDailyTaskNotesInbox(filter);
      setItems(response.items);
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Could not load task notes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

  const unreadCount = useMemo(
    () => items.filter((item) => item.acknowledgementStatus === 'UNREAD').length,
    [items],
  );

  const markSeen = async (note: DailyTaskNoteInboxItem) => {
    setAcknowledgingId(note.id);
    try {
      const updated = await acknowledgeDailyTaskNote(note.dailyTaskId, note.id);
      setItems((prev) =>
        prev.map((row) =>
          row.id === note.id
            ? {
                ...row,
                acknowledgementStatus: updated.acknowledgementStatus,
                acknowledgedByDisplayName: updated.acknowledgedByDisplayName,
                acknowledgedAt: updated.acknowledgedAt,
              }
            : row,
        ),
      );
      toast.success('Marked as Seen.');
      onNoteAcknowledged?.(note.dailyTaskId, { ...note, ...updated });
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Could not mark note as seen.');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <div className="space-y-1.5 px-4 pt-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <MessageSquareText className="size-5" aria-hidden />
            Task note review
          </SheetTitle>
          <SheetDescription>
            Review employee notes and mark them as seen. Unread in this view: {unreadCount}
          </SheetDescription>
        </div>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as DailyTaskNoteInboxStatus)}
          className="px-1"
        >
          <TabsList className="grid w-full grid-cols-3">
            {FILTERS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading notes…
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">No notes in this filter.</p>
          ) : (
            <ul className="space-y-3 pt-3">
              {items.map((note) => (
                <li
                  key={note.id}
                  className={cn(
                    'space-y-2 rounded-lg border p-3 text-sm',
                    note.acknowledgementStatus === 'UNREAD'
                      ? 'border-rose-200/80 bg-rose-50/40'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold tracking-tight">{note.taskTitle}</p>
                      <p className="text-muted-foreground text-xs">
                        Task {note.dailyTaskId.slice(0, 8)}… ·{' '}
                        {note.taskWorkflowStageName ?? '—'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        note.acknowledgementStatus === 'UNREAD'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800',
                      )}
                    >
                      {note.acknowledgementStatus === 'UNREAD' ? 'Not Seen' : 'Seen'}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {note.employeeDisplayName} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  {note.acknowledgementStatus === 'UNREAD' ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      disabled={acknowledgingId === note.id}
                      onClick={() => void markSeen(note)}
                    >
                      {acknowledgingId === note.id ? 'Saving…' : 'Mark as Seen'}
                    </Button>
                  ) : note.acknowledgedAt ? (
                    <p className="text-muted-foreground text-xs">
                      Seen by {note.acknowledgedByDisplayName ?? 'Super Admin'} ·{' '}
                      {new Date(note.acknowledgedAt).toLocaleString()}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
