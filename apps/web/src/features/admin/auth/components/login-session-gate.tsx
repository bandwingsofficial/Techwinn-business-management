'use client';

import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
import { resolvePostAuthRedirect } from '@/features/auth/portal/portal-resolution';
import {
  accessTokenStore,
  hasCsrfCookie,
  refreshAccessToken,
  registerSessionRefresher,
} from '@/shared/api/api-client';
import { suppressPlatformSessionEndedFor } from '@/shared/api/session-ended';
import { isApiError } from '@/shared/api/api-error';
import { getCurrentSession } from '../api/get-current-session';
import { refreshSession } from '../api/refresh-session';

/**
 * If the visitor already has a valid session, send them to the correct portal
 * without flashing the login form.
 */
export function LoginSessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  useEffect(() => {
    registerSessionRefresher(refreshSession);
    return () => registerSessionRefresher(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const endProbe = (errorMessage: string | null = null) => {
      if (controller.signal.aborted) return;
      setProbeError(errorMessage);
      setProbing(false);
    };

    void (async () => {
      if (!hasCsrfCookie() && !accessTokenStore.get()) {
        return;
      }

      setProbing(true);
      suppressPlatformSessionEndedFor(5_000);

      try {
        if (!accessTokenStore.get()) {
          const outcome = await refreshAccessToken();
          if (outcome === 'unauthenticated') {
            endProbe();
            return;
          }
        }

        const session = await getCurrentSession(controller.signal);
        if (controller.signal.aborted) return;

        const { permissions, roles, sessionEmployee } = await getMyPermissions(controller.signal);
        if (controller.signal.aborted) return;

        const destination = resolvePostAuthRedirect({
          admin: session.admin,
          permissions,
          roles: roles ?? [],
          sessionEmployee: sessionEmployee ?? null,
          returnTo,
        });
        router.replace(destination);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isApiError(error) && error.isTransient) {
          endProbe(
            'We could not verify your existing session. Sign in below, or try again in a moment.',
          );
          return;
        }
        endProbe();
      }
    })();

    return () => {
      controller.abort();
      setProbing(false);
    };
  }, [returnTo, router]);

  if (probing) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Checking sign-in…
        </p>
      </div>
    );
  }

  return (
    <>
      {probeError ? (
        <p className="text-muted-foreground mb-4 text-sm" role="status">
          {probeError}
        </p>
      ) : null}
      {children}
    </>
  );
}