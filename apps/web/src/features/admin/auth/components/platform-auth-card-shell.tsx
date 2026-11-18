import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { AUTH_CARD_SHELL_CLASS, AUTH_PANEL_RIGHT_CLASS } from '../constants/auth-ui.constants';
import { PlatformAuthVisualPanel } from './platform-auth-visual-panel';

export function PlatformAuthCardShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(AUTH_CARD_SHELL_CLASS, 'min-h-0', className)}>
      <PlatformAuthVisualPanel />
      <div className={AUTH_PANEL_RIGHT_CLASS}>{children}</div>
    </div>
  );
}