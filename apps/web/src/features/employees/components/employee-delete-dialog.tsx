'use client';

import { Loader2 } from 'lucide-react';
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
import { CRM_PIPELINE_DESTRUCTIVE_ACTION_CLASS } from '@/features/admin/crm/constants';

const DELETE_DESCRIPTION =
  "Are you sure you want to permanently delete this employee?\n\nThe employee's master profile and login access will be permanently removed. Historical attendance, leave, tasks, projects, salary records and related business history will remain preserved and accessible throughout the system.\n\nThis action cannot be undone.";

export function EmployeeDeleteDialog({
  open,
  employeeName,
  completedTaskCount: _completedTaskCount,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  employeeName: string;
  completedTaskCount: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {employeeName}?</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{DELETE_DESCRIPTION}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={CRM_PIPELINE_DESTRUCTIVE_ACTION_CLASS}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              'Delete Employee'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}