import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadsPage } from '@/features/crm/leads';

export const metadata: Metadata = {
  title: 'Leads',
};

/** CRM Leads for custom role portals (`/{portalSlug}/leads`). */
export default function DynamicPortalLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-6xl gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <LeadsPage />
    </Suspense>
  );
}
