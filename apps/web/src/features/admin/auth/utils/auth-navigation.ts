import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { LoginNoticeReason } from '../types/auth.types';
import { loginPath } from './auth-errors';

const AUTH_PUBLIC_PATH_PREFIXES = ['/login', '/accept-invitation'] as const;

export function isAuthPublicPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return AUTH_PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Sends the visitor to login without re-entering when they are already on a public auth route.
 * Preserves `returnTo` from the current path when the session ends on a protected page.
 */
export function redirectToLogin(
  router: AppRouterInstance,
  options: {
    readonly currentPathname: string;
    readonly reason?: LoginNoticeReason;
    readonly returnTo?: string | null;
  },
): void {
  if (isAuthPublicPath(options.currentPathname)) return;

  const returnTo =
    options.returnTo ??
    (options.currentPathname && !isAuthPublicPath(options.currentPathname)
      ? options.currentPathname
      : undefined);

  router.replace(loginPath(options.reason, returnTo));
}