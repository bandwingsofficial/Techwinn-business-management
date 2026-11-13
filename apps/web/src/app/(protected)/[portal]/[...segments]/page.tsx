import { notFound } from 'next/navigation';
import { renderPortalWorkspacePage } from '@/features/auth/portal/portal-workspace-page';

type PageProps = {
  params: Promise<{ portal: string; segments: string[] }>;
};

export default async function DynamicPortalWorkspaceCatchAllPage({ params }: PageProps) {
  const { portal, segments } = await params;
  const view = renderPortalWorkspacePage(portal, segments);
  if (!view) {
    notFound();
  }
  return view;
}
