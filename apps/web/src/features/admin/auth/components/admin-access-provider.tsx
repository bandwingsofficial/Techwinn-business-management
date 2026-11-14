'use client';

import type { PermissionKey } from '@techwin/contracts';
import { WorkspaceShellSkeleton } from '@/components/loading/skeletons';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { filterAdminNav, type AdminNavGroupWithAccess } from '@/features/admin/navigation/filter-admin-nav';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';
import {
  pathBelongsToPortalSegment,
  rewriteLegacyPortalPrefix,
  rewriteMismatchedPortalPrefix,
} from '@/features/auth/portal/portal-segment';
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
    const legacyRewrite = rewriteLegacyPortalPrefix(pathname, access.portalSegment);
    if (legacyRewrite) return legacyRewrite;
    const portalRewrite = rewriteMismatchedPortalPrefix(pathname, access.portalSegment);
    if (portalRewrite) return portalRewrite;
    if (!pathBelongsToPortalSegment(pathname, access.portalSegment)) {
      return access.defaultDashboard;
    }
    if (canAccessAppPath(pathname, value.permissionSet, access.navAccess, access.portalSegment)) {
      return null;
    }
    const fallback =
      value.navGroups.flatMap((group) => group.items).find((item) => item.kind === 'link')?.href ??
      access.defaultDashboard;
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
