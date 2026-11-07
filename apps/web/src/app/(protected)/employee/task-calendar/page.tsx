import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeTaskCalendarRoute } from '@/features/employee/components/employee-task-calendar-route';

export default function EmployeeTaskCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[28rem] w-full" />
        </div>
      }
    >
      <EmployeeTaskCalendarRoute />
    </Suspense>
  );
}
