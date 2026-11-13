'use client';

import { usePermissions } from '../components/permissions-provider';
import { adminFeaturePathToPortal } from './portal-paths';

export function usePortalNavigation() {
  const { portalSegment, defaultDashboard, portalDashboard } = usePermissions();
  return {
    portal: portalSegment,
    dashboardHref: defaultDashboard,
    portalDashboardHref: portalDashboard,
    toPortalPath: (adminFeatureHref: string) => adminFeaturePathToPortal(adminFeatureHref, portalSegment),
    dashboardBreadcrumb: { label: 'Dashboard' as const, href: portalDashboard },
  };
}
