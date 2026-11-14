'use client';

import type { PermissionKey } from '@techwin/contracts';
import { WorkspaceShellSkeleton } from '@/components/loading/skeletons';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { filterAdminNav, type AdminNavGroupWithAccess } from '@/features/admin/navigation/filter-admin-nav';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';
import { rewritePathToTrustedPortal } from '@/features/auth/portal/portal-routing';
import { usePermissions } from '@/features/auth/components/permissions-provider';

export type AdminAccessContextValue = {
  readonly permissions: readonly PermissionKey[];
  readonly permissionSet: ReadonlySet<PermissionKey>;
  readonly navGroups: readonly AdminNavGroupWithAccess[];
  readonly loading: false;
  readonly has: (key: PermissionKey) => boolean;
  readonly hasAny: (...keys: PermissionKey[]) => boolean;
  readonly hasAll: (...keys: PermissionKey[]) => boolean;
  readonly refresh: () => Promise<void>;
};

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);

export function useAdminAccess(): AdminAccessContextValue {
  const value = useContext(AdminAccessContext);
  if (!value) {
    throw new Error('useAdminAccess must be used inside <AdminAccessProvider>.');
  }
  return value;
}

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const access = usePermissions();

  const value = useMemo((): AdminAccessContextValue => {
    if (access.permissions.length === 0) {
      return {
        permissions: access.permissions,
        permissionSet: access.permissionSet,
        navGroups: [],
        loading: false,
        has: access.has,
        hasAny: access.hasAny,
        hasAll: access.hasAll,
        refresh: access.refresh,
      };
    }
    return {
      permissions: access.permissions,
      permissionSet: access.permissionSet,
      navGroups: filterAdminNav(access.permissions, access.navAccess, access.portalSegment),
      loading: false,
      has: access.has,
      hasAny: access.hasAny,
      hasAll: access.hasAll,
      refresh: access.refresh,
    };
  }, [access]);

  const redirectTarget = useMemo(() => {
    if (value.permissionSet.size === 0) return null;

    const portalRewrite = rewritePathToTrustedPortal(pathname, access.portalSegment);
    if (portalRewrite) return portalRewrite;

    if (canAccessAppPath(pathname, value.permissionSet, access.navAccess, access.portalSegment)) {
      return null;
    }

    const navLinks = value.navGroups.flatMap((group) => group.items).filter((item) => item.kind === 'link');
    const authorizedNavDestination = navLinks.find((item) =>
      canAccessAppPath(item.href, value.permissionSet, access.navAccess, access.portalSegment),
    )?.href;

    const fallback = authorizedNavDestination ?? access.defaultDashboard;
    return pathname !== fallback ? fallback : null;
  }, [access.defaultDashboard, access.navAccess, access.portalSegment, pathname, value]);

  useEffect(() => {
    if (!redirectTarget) return;
    const qs = searchParams.toString();
    router.replace(qs ? `${redirectTarget}?${qs}` : redirectTarget);
  }, [redirectTarget, router, searchParams]);

  if (redirectTarget) {
    return <WorkspaceShellSkeleton />;
  }

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}
