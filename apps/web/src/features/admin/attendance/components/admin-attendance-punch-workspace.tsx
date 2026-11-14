'use client';

import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  CRM_HEADER_TOOLBAR_ROW_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import { cn } from '@/shared/lib/utils';
import { AttendancePageToolbar } from './attendance-page-toolbar';
import { AttendanceRecordsProvider } from './attendance-records-context';
import { AttendanceRecordsSection } from './attendance-records-section';
import { AttendanceSelfPunchPanel } from './attendance-self-punch-panel';
import {
  ATTENDANCE_PUNCH_IN,
  ATTENDANCE_PUNCH_OUT,
  ATTENDANCE_PUNCH_VIEW_ALL,
  hasAttendancePermission,
} from '@techwin/contracts';
import type { AttendanceRecordsScope } from '../hooks/use-attendance-records-list';

/** Punch In / Punch Out page — self punch plus permitted punch history (never org records management). */
export function AdminAttendancePunchWorkspace({
  scope: scopeOverride,
}: {
  scope?: AttendanceRecordsScope;
}) {
  const { permissionSet } = useAdminAccess();
  const scope: AttendanceRecordsScope =
    scopeOverride ??
    (hasAttendancePermission(permissionSet, ATTENDANCE_PUNCH_VIEW_ALL) ? 'organization' : 'self');
  const showPunchPanel =
    hasAttendancePermission(permissionSet, ATTENDANCE_PUNCH_IN) ||
    hasAttendancePermission(permissionSet, ATTENDANCE_PUNCH_OUT);

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Punch In / Punch Out' }]} className="mb-0.5" />

      <AttendanceRecordsProvider active scope={scope}>
        <section aria-label="Punch In / Punch Out" className="workspace-surface min-w-0 max-w-full overflow-hidden">
          <div className="min-w-0 max-w-full rounded-lg">
            <CrmToolbarHeader
              title="Punch In / Punch Out"
              description="Record and monitor employee working hours."
              layout="inline"
              className="rounded-none border-0 bg-card pb-2 shadow-none"
              toolbar={null}
              toolbarRowClassName="min-w-0 shrink-0"
              bottomRow={
                scope === 'self' ? (
                  <div className={cn(CRM_HEADER_TOOLBAR_ROW_CLASS, 'lg:flex-nowrap')}>
                    <AttendancePageToolbar tab="records" onTabChange={() => {}} layout="header" variant="punch" />
                  </div>
                ) : (
                  <div className={cn(CRM_HEADER_TOOLBAR_ROW_CLASS, 'lg:flex-nowrap')}>
                    <AttendancePageToolbar tab="records" onTabChange={() => {}} variant="punch" orgPunchHistory />
                  </div>
                )
              }
            />

            {showPunchPanel ? <AttendanceSelfPunchPanel /> : null}
            <AttendanceRecordsSection mode="punch" />
          </div>
        </section>
      </AttendanceRecordsProvider>
    </div>
  );
}