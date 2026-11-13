'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CRM_PIPELINE_DIALOG_CLOSE_CLASS,
  CRM_PIPELINE_DIALOG_FOOTER_CLASS,
  CRM_PIPELINE_DIALOG_HEADER_CLASS,
  CRM_PIPELINE_DIALOG_TITLE_CLASS,
  CRM_PIPELINE_FORM_DIALOG_CLASS,
} from '@/features/admin/crm/constants';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { isAbortError } from '@/shared/lib/abort-error';
import { isApiError } from '@/shared/api/api-error';
import { cn } from '@/shared/lib/utils';
import { fetchDailyTask, fetchDailyTaskActivities } from '../api/daily-tasks';
import type { DailyTaskActivityItem, DailyTaskDetail } from '../types';
import { priorityBadgeClass } from '../utils/stage-colors';
import { DailyTaskActivityPanel } from './daily-task-activity-panel';

const BTN_SECONDARY =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';
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

function formatLoadError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 403) {
      return error.message || 'You do not have permission to view this task.';
    }
    if (error.status === 404) {
      return error.message || 'This task is not available.';
    }
    if (error.status === 401) {
      return 'Your session expired. Sign in again and retry.';
    }
    if (error.status !== null && error.status >= 500) {
      return 'The server could not load this task. Try again in a moment.';
    }
    return error.message;
  }
  return 'Could not load task details.';
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

  const [task, setTask] = useState<DailyTaskDetail | null>(null);
  const [activities, setActivities] = useState<readonly DailyTaskActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    if (!open || !taskId) {
      setTask(null);
      setActivities([]);
      setLoadError(null);
      setActivitiesError(null);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    const controller = new AbortController();

    setLoading(true);
    setLoadError(null);
    setActivitiesError(null);
    setTask(null);
    setActivities([]);

    void (async () => {
      try {
        const detail = await fetchDailyTask(taskId, controller.signal);
        if (loadGenerationRef.current !== generation || controller.signal.aborted) return;
        setTask(detail);
        try {
          const activityResponse = await fetchDailyTaskActivities(taskId, controller.signal);
          if (loadGenerationRef.current !== generation || controller.signal.aborted) return;
          setActivities(activityResponse.items);
        } catch (activityErr) {
          if (isAbortError(activityErr)) return;
          if (loadGenerationRef.current !== generation) return;
          setActivities([]);
          setActivitiesError(
            isApiError(activityErr) && activityErr.status === 403
              ? 'Activity timeline is not available for your role.'
              : 'Could not load activity timeline.',
          );
        }
      } catch (error) {
        if (isAbortError(error)) return;
        if (loadGenerationRef.current !== generation) return;
        setTask(null);
        const message = formatLoadError(error);
        setLoadError(message);
        toast.error(message);
      } finally {
        if (loadGenerationRef.current === generation && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [open, taskId, toast]);

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
          ) : loadError ? (
            <p className="text-muted-foreground py-12 text-center text-sm">{loadError}</p>
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
                {activitiesError ? (
                  <p className="text-muted-foreground text-sm">{activitiesError}</p>
                ) : (
                  <DailyTaskActivityPanel items={activities} newestFirst />
                )}
              </section>
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center text-sm">
              This task is not available.
            </p>
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
