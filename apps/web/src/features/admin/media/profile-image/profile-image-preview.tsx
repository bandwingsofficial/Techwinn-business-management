'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export function ProfileImagePreview({
  children,
  className,
  label = 'Profile photo preview',
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm ring-1 ring-slate-900/5',
        className,
      )}
      aria-label={label}
      role="img"
    >
      {children}
    </div>
  );
}