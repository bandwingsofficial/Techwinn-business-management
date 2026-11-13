import type { Metadata } from 'next';
import { PipelinesPage } from '@/features/crm/pipelines/pages/pipelines-page';

export const metadata: Metadata = {
  title: 'Pipeline',
};

/** CRM Pipeline for the employee portal (`/employee/pipeline`). */
export default function EmployeePortalPipelinePage() {
  return <PipelinesPage />;
}
