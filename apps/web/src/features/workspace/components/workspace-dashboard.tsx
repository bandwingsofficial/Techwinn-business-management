'use client';

import { usePermissions } from '@/features/auth/components/permissions-provider';
import { formatMembershipRoleDetails } from '@/features/auth/membership/membership-access';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';

/**
 * Single shared dashboard for every organization role and portal segment.
 * Role name comes from authenticated membership context, not the URL.
 */
export function WorkspaceDashboard() {
  const { admin } = useAuthenticatedAdmin();
  const { roles } = usePermissions();
  const roleLabel = formatMembershipRoleDetails(admin, roles);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <header className="grid min-w-0 gap-2">
        <h1 className="type-page-title">Welcome to your Dashboard!</h1>
        {roleLabel ? (
          <p className="text-foreground text-lg font-semibold tracking-tight">{roleLabel}</p>
        ) : null}
        <p className="text-muted-foreground text-sm leading-relaxed">
          {roleLabel
            ? `You are logged in as ${roleLabel}. Use the sidebar to access all available modules.`
            : 'Your account does not have an organization role assigned yet. Contact an administrator.'}
        </p>
      </header>
    </div>
  );
}
