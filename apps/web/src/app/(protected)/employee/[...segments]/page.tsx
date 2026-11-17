import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import { notFound } from 'next/navigation';
import { renderPortalWorkspacePage } from '@/features/auth/portal/portal-workspace-page';

type PageProps = {
  params: Promise<{ segments: string[] }>;
};

/** Organization HR/PM/CRM modules under `/employee/...` (mirrored from admin workspaces). */
export default async function EmployeeMirroredWorkspacePage({ params }: PageProps) {
  const { segments } = await params;
  const view = renderPortalWorkspacePage(SYSTEM_ROLE_KEYS.employee, segments);
  if (!view) {
    notFound();
  }
  return view;
}