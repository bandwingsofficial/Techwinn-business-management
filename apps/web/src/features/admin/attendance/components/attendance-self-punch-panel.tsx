'use client';

import { useEmployeeAttendancePage } from '@/features/employee/hooks/use-employee-attendance-page';
import { EmployeeAttendanceTodayCard } from '@/features/employee/components/employee-attendance-today-card';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import {
  ATTENDANCE_PUNCH_IN,
  ATTENDANCE_PUNCH_OUT,
  hasAttendancePermission,
} from '@techwin/contracts';
import { useAttendanceRecordsContext } from './attendance-records-context';

export function AttendanceSelfPunchPanel() {
  const { permissionSet } = useAdminAccess();
  const page = useEmployeeAttendancePage();
  const { refreshAll } = useAttendanceRecordsContext();

  const onPunchIn = async () => {
    const ok = await page.onPunchIn();
    if (ok) await refreshAll();
  };

  const onPunchOut = async () => {
    const ok = await page.onPunchOut();
    if (ok) await refreshAll();
  };

  if (page.todayError && !page.today) {
    return <CrmErrorAlert message={page.todayError} />;
  }

  return (
    <div className="border-b border-border/60 px-4 py-4 sm:px-5">
      <EmployeeAttendanceTodayCard
        today={page.today}
        loading={page.todayLoading}
        clockMs={page.clockMs}
        punchAction={page.punchAction}
        allowPunchIn={hasAttendancePermission(permissionSet, ATTENDANCE_PUNCH_IN)}
        allowPunchOut={hasAttendancePermission(permissionSet, ATTENDANCE_PUNCH_OUT)}
        onPunchIn={() => void onPunchIn()}
        onPunchOut={() => void onPunchOut()}
      />
    </div>
  );
}
