'use client';

import { ArrowDown, ArrowUp, GitBranch, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StageColorSelect } from '@/features/admin/components/stage-color-select';
import { useAdminToast } from '@/features/admin/components/toast';
import { normalizeStageColor } from '@/features/admin/crm/utils/stage-color';
import { fetchDailyTaskWorkflowStages, updateDailyTaskWorkflowStages } from '../api/daily-tasks';
import type { DailyTaskWorkflowStage } from '../types';

type StageDraft = {
  id?: string;
  stageKey: string;
  name: string;
  sortOrder: number;
  colorToken: string;
  isActive: boolean;
  isCompletedStage: boolean;
  taskCount: number;
};

type PendingDelete = {
  index: number;
  stage: StageDraft;
  moveToStageId: string | 'UNASSIGNED';
};

type StageReassignment = {
  fromStageId: string;
  toStageId: string | null;
};

function reorderDrafts(drafts: StageDraft[], from: number, to: number): StageDraft[] {
  if (to < 0 || to >= drafts.length || from === to) return drafts;
  const next = [...drafts];
  const [item] = next.splice(from, 1);
  if (!item) return drafts;
  next.splice(to, 0, item);
  return next.map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
}

function toDraft(stage: DailyTaskWorkflowStage): StageDraft {
  return {
    id: stage.id,
    stageKey: stage.stageKey,
    name: stage.name,
    sortOrder: stage.sortOrder,
    colorToken: normalizeStageColor(stage.colorToken),
    isActive: stage.isActive,
    isCompletedStage: stage.isCompletedStage,
    taskCount: stage.taskCount ?? 0,
  };
}

export function DailyTaskWorkflowDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const [drafts, setDrafts] = useState<StageDraft[]>([]);
  const [reassignments, setReassignments] = useState<StageReassignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setReassignments([]);
    setPendingDelete(null);
    void fetchDailyTaskWorkflowStages()
      .then((response) =>
        setDrafts(
          [...response.stages]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(toDraft),
        ),
      )
      .catch(() => {
        setDrafts([]);
        toast.error('Could not load workflow stages.');
      })
      .finally(() => setLoading(false));
  }, [open, toast]);

  const deleteTargets = useMemo(() => {
    if (!pendingDelete) return [] as StageDraft[];
    return drafts.filter((_, index) => index !== pendingDelete.index);
  }, [drafts, pendingDelete]);

  const addStage = () => {
    const key = `custom_${Date.now()}`;
    setDrafts((current) => [
      ...current,
      {
        stageKey: key,
        name: 'New stage',
        sortOrder: current.length + 1,
        colorToken: normalizeStageColor('slate'),
        isActive: true,
        isCompletedStage: false,
        taskCount: 0,
      },
    ]);
  };

  const requestDelete = (index: number) => {
    const stage = drafts[index];
    if (!stage) return;
    const remaining = drafts.filter((_, i) => i !== index);
    setPendingDelete({
      index,
      stage,
      moveToStageId: remaining[0]?.id ?? 'UNASSIGNED',
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { index, stage, moveToStageId } = pendingDelete;
    if (stage.id && stage.taskCount > 0) {
      setReassignments((current) => {
        const without = current.filter((entry) => entry.fromStageId !== stage.id);
        return [
          ...without,
          {
            fromStageId: stage.id!,
            toStageId: moveToStageId === 'UNASSIGNED' ? null : moveToStageId,
          },
        ];
      });
    }
    setDrafts((current) =>
      current
        .filter((_, i) => i !== index)
        .map((entry, order) => ({ ...entry, sortOrder: order + 1 })),
    );
    setPendingDelete(null);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const remainingIds = new Set(drafts.map((stage) => stage.id).filter(Boolean) as string[]);
      const payloadReassignments = reassignments
        .filter((entry) => !remainingIds.has(entry.fromStageId))
        .map((entry) => ({
          fromStageId: entry.fromStageId,
          toStageId:
            entry.toStageId && remainingIds.has(entry.toStageId) ? entry.toStageId : null,
        }));

      const response = await updateDailyTaskWorkflowStages({
        stages: drafts.map((stage, index) => ({
          id: stage.id,
          stageKey: stage.stageKey,
          name: stage.name.trim() || 'Untitled stage',
          sortOrder: index + 1,
          colorToken: normalizeStageColor(stage.colorToken),
          isActive: stage.isActive,
          isCompletedStage: stage.isCompletedStage,
        })),
        ...(payloadReassignments.length > 0 ? { reassignments: payloadReassignments } : {}),
      });
      setDrafts(
        [...response.stages]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(toDraft),
      );
      setReassignments([]);
      toast.success(
        response.stages.length === 0
          ? 'All workflow stages removed.'
          : 'Workflow stages updated.',
      );
      onOpenChange(false);
      await onSaved();
    } catch {
      toast.error('Could not save workflow stages. Check task reassignment and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage workflow stages</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
            </p>
          ) : drafts.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center">
              <GitBranch className="size-8 opacity-60" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-foreground text-sm font-medium">No workflow stages yet</p>
                <p className="max-w-sm text-sm">
                  Your daily task workflow is empty. Create your first stage to start organizing and
                  tracking tasks.
                </p>
              </div>
              <Button type="button" size="sm" onClick={addStage}>
                <Plus className="mr-1.5 size-4" aria-hidden="true" /> Create First Stage
              </Button>
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="max-h-[420px] space-y-3 overflow-y-auto py-2">
                {drafts.map((stage, index) => (
                  <div key={stage.id ?? stage.stageKey} className="border-border rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7"
                              disabled={index === 0}
                              aria-label="Move up"
                              onClick={() =>
                                setDrafts((current) => reorderDrafts(current, index, index - 1))
                              }
                            >
                              <ArrowUp className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move up</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7"
                              disabled={index === drafts.length - 1}
                              aria-label="Move down"
                              onClick={() =>
                                setDrafts((current) => reorderDrafts(current, index, index + 1))
                              }
                            >
                              <ArrowDown className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move down</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <Input
                            value={stage.name}
                            aria-label="Stage name"
                            onChange={(event) =>
                              setDrafts((current) =>
                                current.map((entry, i) =>
                                  i === index ? { ...entry, name: event.target.value } : entry,
                                ),
                              )
                            }
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 shrink-0"
                                aria-label={`Delete ${stage.name || 'stage'}`}
                                onClick={() => requestDelete(index)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete stage</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StageColorSelect
                            id={`workflow-stage-color-${stage.stageKey}`}
                            className="w-[10.5rem]"
                            value={stage.colorToken}
                            aria-label={`Color for ${stage.name || 'stage'}`}
                            onValueChange={(color) =>
                              setDrafts((current) =>
                                current.map((entry, i) =>
                                  i === index ? { ...entry, colorToken: color } : entry,
                                ),
                              )
                            }
                          />
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={stage.isActive}
                              onChange={(event) =>
                                setDrafts((current) =>
                                  current.map((entry, i) =>
                                    i === index
                                      ? { ...entry, isActive: event.target.checked }
                                      : entry,
                                  ),
                                )
                              }
                            />
                            Active
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={stage.isCompletedStage}
                              onChange={(event) =>
                                setDrafts((current) =>
                                  current.map((entry, i) =>
                                    i === index
                                      ? { ...entry, isCompletedStage: event.target.checked }
                                      : entry,
                                  ),
                                )
                              }
                            />
                            Completed stage
                          </label>
                          {stage.taskCount > 0 ? (
                            <span className="text-muted-foreground text-[11px]">
                              {stage.taskCount} task{stage.taskCount === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={addStage}>
                  <Plus className="mr-1.5 size-4" aria-hidden="true" /> Add stage
                </Button>
              </div>
            </TooltipProvider>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving || loading} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save stages'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow stage?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{' '}
              <span className="text-foreground font-medium">
                {pendingDelete?.stage.name?.trim() || 'this stage'}
              </span>{' '}
              from your daily task workflow.
              {pendingDelete && pendingDelete.stage.taskCount > 0 ? (
                <>
                  {' '}
                  {pendingDelete.stage.taskCount} task
                  {pendingDelete.stage.taskCount === 1 ? ' is' : 's are'} currently assigned to this
                  stage. Choose where those tasks should go before deleting.
                </>
              ) : (
                <> Existing tasks are not deleted.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingDelete && pendingDelete.stage.taskCount > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Move tasks to</p>
              <Select
                value={pendingDelete.moveToStageId}
                onValueChange={(value) =>
                  setPendingDelete((current) =>
                    current ? { ...current, moveToStageId: value } : current,
                  )
                }
              >
                <SelectTrigger aria-label="Target stage for tasks">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {deleteTargets.length === 0 ? (
                    <SelectItem value="UNASSIGNED">Leave tasks without a stage</SelectItem>
                  ) : (
                    <>
                      {deleteTargets.map((target) =>
                        target.id ? (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                          </SelectItem>
                        ) : null,
                      )}
                      <SelectItem value="UNASSIGNED">Leave tasks without a stage</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonDestructiveClass}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              Delete stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const buttonDestructiveClass =
  'bg-destructive text-destructive-foreground hover:bg-destructive/90';
