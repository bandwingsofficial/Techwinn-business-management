import type { ReactNode } from 'react';
import { AdminAccessProvider } from '@/features/admin/auth/components/admin-access-provider';
import { AdminShell } from '@/features/admin/auth/components/admin-shell';
import { ToastProvider } from '@/features/admin/components/toast';

/** Shared shell for dynamically created role portals (custom portal URL slugs). */
export default function DynamicPortalLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminAccessProvider>
        <AdminShell>{children}</AdminShell>
      </AdminAccessProvider>
    </ToastProvider>
  );
}
