import type { Metadata } from 'next';
import { WorkspaceDashboard } from '@/features/workspace/components/workspace-dashboard';
import '@/features/dashboard/styles/dashboard-page-background.css';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DynamicPortalDashboardPage() {
  return <WorkspaceDashboard />;
}
