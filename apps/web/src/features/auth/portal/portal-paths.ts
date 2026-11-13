import { portalDashboardPath, mapHrefToPortalSegment, pathBelongsToPortalSegment } from './portal-segment';

export function adminFeaturePathToPortal(adminPath: string, portalSegment: string): string {
  if (adminPath.startsWith('/admin/')) {
    return mapHrefToPortalSegment(adminPath, portalSegment);
  }
  if (adminPath.startsWith('/project-manager/')) {
    return mapHrefToPortalSegment(
      adminPath.replace('/project-manager/', '/admin/'),
      portalSegment,
    );
  }
  if (adminPath.startsWith('/employee/')) {
    if (portalSegment === 'employee') return adminPath;
    return mapHrefToPortalSegment(adminPath.replace('/employee/', '/admin/'), portalSegment);
  }
  return adminPath;
}

export { portalDashboardPath, pathBelongsToPortalSegment };
