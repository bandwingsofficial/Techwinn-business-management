import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminAttendanceRecordsWorkspace } from '@/features/admin/attendance/components/admin-attendance-records-workspace';

export default function EmployeeAttendanceRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AdminAttendanceRecordsWorkspace />
    </Suspense>
  );
}