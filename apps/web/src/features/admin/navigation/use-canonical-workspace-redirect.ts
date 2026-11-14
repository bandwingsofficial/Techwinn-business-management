'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import {
  canonicalDailyTasksPath,
  canonicalTaskCalendarPath,
  prefersOrganizationWorkspace,
} from './navigation-route-policy';

/**
 * Sends organization-workspace users away from `/employee` task URLs onto the
 * canonical `/admin` routes (preserving query string).
 *
 * @returns `true` while a redirect is required so callers can skip rendering
 * the employee-scoped page and avoid a self-service flash.
 */
export function useCanonicalWorkspaceRedirect(): boolean {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { permissionSet, navAccess, portalSegment } = usePermissions();

  const redirectTo = useMemo(() => {
    if (!prefersOrganizationWorkspace(permissionSet, navAccess)) return null;

    let target: string | null = null;
    if (pathname === '/employee/daily-tasks' || pathname.startsWith('/employee/daily-tasks/')) {
      target = canonicalDailyTasksPath(permissionSet, navAccess, portalSegment);
    } else if (
      pathname === '/employee/task-calendar' ||
      pathname.startsWith('/employee/task-calendar/')
    ) {
      target = canonicalTaskCalendarPath(permissionSet, navAccess, portalSegment);
    }

    if (!target || target === pathname) return null;
    const qs = searchParams.toString();
    return qs ? `${target}?${qs}` : target;
  }, [navAccess, pathname, permissionSet, portalSegment, searchParams]);

  useEffect(() => {
    if (!redirectTo) return;
    router.replace(redirectTo);
  }, [redirectTo, router]);

  return redirectTo !== null;
}
