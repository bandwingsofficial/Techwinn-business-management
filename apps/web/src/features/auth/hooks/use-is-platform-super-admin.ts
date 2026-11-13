'use client';

import { useAdminSession } from '@/features/admin/auth/hooks/use-admin-session';

/** Platform-level Super Admin (`SUPER_ADMIN`), not org role display names. */
export function useIsPlatformSuperAdmin(): boolean {
  const { state } = useAdminSession();
  if (state.status !== 'authenticated') return false;
  return state.admin.role === 'SUPER_ADMIN';
}
