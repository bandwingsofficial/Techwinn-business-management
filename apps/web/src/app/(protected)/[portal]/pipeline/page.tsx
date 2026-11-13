import type { Metadata } from 'next';
import { PipelinesPage } from '@/features/crm/pipelines/pages/pipelines-page';

export const metadata: Metadata = {
  title: 'Pipeline',
};

/** CRM Pipeline for custom role portals (`/{portalSlug}/pipeline`). */
export default function DynamicPortalPipelinePage() {
  return <PipelinesPage />;
}
