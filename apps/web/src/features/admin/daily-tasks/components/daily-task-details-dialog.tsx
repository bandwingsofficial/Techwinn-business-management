'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { hasDailyTaskCommentPermission } from '@techwin/contracts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CRM_PIPELINE_DIALOG_CLOSE_CLASS,
  CRM_PIPELINE_DIALOG_FOOTER_CLASS,
  CRM_PIPELINE_DIALOG_HEADER_CLASS,
  CRM_PIPELINE_DIALOG_TITLE_CLASS,
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { cn } from '@/shared/lib/utils';
import {
  addDailyTaskComment,
  fetchDailyTask,
  fetchDailyTaskActivities,
} from '../api/daily-tasks';
import type { DailyTaskActivityItem, DailyTaskDetail } from '../types';
import { priorityBadgeClass } from '../utils/stage-colors';
import { DailyTaskActivityPanel } from './daily-task-activity-panel';

const BTN_SECONDARY =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';
const BTN_PRIMARY =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

function formatCategory(category: DailyTaskDetail['category']): string | null {
  if (!category) return null;
  return category.charAt(0) + category.slice(1).toLowerCase().replaceAll('_', ' ');
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </h4>
      <div className="text-foreground text-sm leading-snug">{children}</div>
    </div>
  );
}

export function DailyTaskDetailsDialog({
  taskId,
  open,
  onOpenChange,
  onChanged,
  employeeMode = false,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
  employeeMode?: boolean;
}) {
  const toast = useAdminToast();
  const { has, permissionSet } = usePermissions();
  const canAddNote =
    hasDailyTaskCommentPermission(permissionSet) || (!employeeMode && has('tasks.update'));

  const [task, setTask] = useState<DailyTaskDetail | null>(null);
  const [activities, setActivities] = useState<readonly DailyTaskActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const noteRequestRef = useRef(false);

  useEffect(() => {
    setNoteDraft('');
  }, [taskId, open]);

  useEffect(() => {
    if (!open || !taskId) {
      setTask(null);
      setActivities([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      fetchDailyTask(taskId, controller.signal),
      fetchDailyTaskActivities(taskId, controller.signal),
    ])
      .then(([detail, activityResponse]) => {
        setTask(detail);
        setActivities(activityResponse.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) toast.error('Could not load task details.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, taskId, toast]);

  const onAddNote = async () => {
    if (!task || !noteDraft.trim() || noteRequestRef.current) return;
    noteRequestRef.current = true;
    setNoteSaving(true);
    try {
      const scope = employeeMode ? 'employee' : has('tasks.update') ? 'admin' : 'employee';
      await addDailyTaskComment(task.id, { text: noteDraft.trim(), scope });
      setNoteDraft('');
      const [detail, activityResponse] = await Promise.all([
        fetchDailyTask(task.id),
        fetchDailyTaskActivities(task.id),
      ]);
      setTask(detail);
      setActivities(activityResponse.items);
      toast.success('Note saved.');
      await onChanged();
    } catch {
      toast.error('Could not save note.');
    } finally {
      noteRequestRef.current = false;
      setNoteSaving(false);
    }
  };

  const categoryLabel = task?.type === 'GENERAL' ? formatCategory(task.category) : null;
  const statusLabel = task?.workflowStageName ?? task?.stageName ?? '—';
  const createdBy =
    task?.createdByDisplayName ??
    activities.find((item) => item.eventType === 'CREATED')?.actorDisplayName ??
    '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(CRM_PIPELINE_FORM_DIALOG_CLASS, CRM_PIPELINE_DIALOG_CLOSE_CLASS, 'sm:max-w-xl')}
      >
        <DialogHeader className={CRM_PIPELINE_DIALOG_HEADER_CLASS}>
          <DialogTitle className={CRM_PIPELINE_DIALOG_TITLE_CLASS}>View details</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-auto overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-3">
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading task…
            </div>
          ) : task ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <DetailField label="Task title">
                  <p className="text-base font-semibold tracking-tight">{task.title}</p>
                </DetailField>
                <DetailField label="Description">
                  <p className="whitespace-pre-wrap">{task.description.trim() || '—'}</p>
                </DetailField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Priority">
                    <span
                      className={cn(
                        'inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                        priorityBadgeClass(task.priority),
                      )}
                    >
                      {task.priority}
                    </span>
                  </DetailField>
                  <DetailField label="Current status">{statusLabel}</DetailField>
                  <DetailField label="Project / category">
                    {task.type === 'PROJECT'
                      ? [task.projectName, task.projectPhaseName].filter(Boolean).join(' · ') || '—'
                      : categoryLabel || 'General'}
                  </DetailField>
                  <DetailField label="Assigned date">{formatDisplayDate(task.assignDate)}</DetailField>
                  <DetailField label="Due date">{formatDisplayDate(task.dueDate)}</DetailField>
                  <DetailField label="Created by">{createdBy}</DetailField>
                  <DetailField label="Created date">{formatDateTime(task.createdAt)}</DetailField>
                </div>
                <DetailField label="Assigned employee(s)">
                  {task.assignees.length === 0 ? (
                    <p className="text-muted-foreground">No assignees</p>
                  ) : (
                    <ul className="space-y-2">
                      {task.assignees.map((assignee) => (
                        <li key={assignee.id} className="flex items-center gap-2">
                          <EmployeeAvatar
                            displayName={assignee.displayName}
                            profileImageUrl={assignee.profileImageUrl}
                            className="size-8"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{assignee.displayName}</p>
                            {assignee.jobTitle ? (
                              <p className="text-muted-foreground truncate text-xs">
                                {assignee.jobTitle}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </DetailField>
              </section>

              <section className="border-border/70 space-y-3 border-t pt-5">
                <h3 className="text-foreground text-sm font-semibold tracking-tight">
                  Activity timeline
                </h3>
                <DailyTaskActivityPanel items={activities} newestFirst />
              </section>

              {canAddNote ? (
                <section className="border-border/70 space-y-3 border-t pt-5">
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">
                    Administrative notes
                  </h3>
                  <Textarea
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder={
                      employeeMode
                        ? 'Report progress, blockers or questions…'
                        : 'Add an administrative note…'
                    }
                    rows={3}
                    className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                  />
                  <Button
                    type="button"
                    className={cn('h-10 px-4', BTN_PRIMARY)}
                    disabled={noteSaving || !noteDraft.trim()}
                    onClick={() => void onAddNote()}
                  >
                    {noteSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      'Add Note'
                    )}
                  </Button>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center text-sm">Task not found.</p>
          )}
        </div>

        <DialogFooter className={CRM_PIPELINE_DIALOG_FOOTER_CLASS}>
          <Button
            type="button"
            variant="outline"
            className={BTN_SECONDARY}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
