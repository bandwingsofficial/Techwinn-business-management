import type { Metadata } from 'next';
import { WorkspaceDashboard } from '@/features/workspace/components/workspace-dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function ProjectManagerDashboardPage() {
  return <WorkspaceDashboard />;
}
