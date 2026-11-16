'use client';

import { BarChart3 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export function DashboardEmptyState({
  title = 'No records yet',
  description = 'There is no data in the selected period for your access scope.',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center',
        className,
      )}
    >
      <div className="bg-card text-muted-foreground flex size-10 items-center justify-center rounded-full border border-slate-200 shadow-xs">
        <BarChart3 className="size-5" aria-hidden />
      </div>
      <p className="text-[#0F172A] text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{description}</p>
    </div>
  );
}