import type { ReactNode } from 'react';
import { AUTH_PAGE_BACKGROUND_CLASS } from '../constants/auth-ui.constants';
import { PlatformAuthCardShell } from './platform-auth-card-shell';

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${AUTH_PAGE_BACKGROUND_CLASS} relative box-border flex min-h-dvh w-full flex-col items-center justify-center px-5 py-8 sm:px-8 sm:py-10`}
    >
      <div aria-hidden className={`fixed inset-0 -z-10 ${AUTH_PAGE_BACKGROUND_CLASS}`} />
      <PlatformAuthCardShell>{children}</PlatformAuthCardShell>
      <p className="text-[#667085] mt-4 max-w-[min(100%,960px)] shrink-0 text-center text-[11px] leading-snug">
        Restricted system. Access is limited to authorized platform administrators and is audited.
      </p>
    </div>
  );
}