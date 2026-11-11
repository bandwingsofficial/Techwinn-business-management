import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
import { accessTokenStore } from '@/shared/api/access-token-store';
import { suppressPlatformSessionEndedFor } from '@/shared/api/session-ended';
import type { PlatformVerifyTotpResponse } from '../types/auth.types';
import {
  armPostAuthBootstrap,
  sessionSummaryFromAuthResponse,
} from '../utils/post-auth-bootstrap';

/**
 * Completes platform sign-in after TOTP (or equivalent) succeeds.
 *
 * Authentication completion and post-login permission loading are separate:
 * a permissions/network failure must not be reported as a failed TOTP step.
 * PermissionsProvider reloads access when bootstrap permissions are empty.
 */
export async function finalizePlatformSignIn(response: PlatformVerifyTotpResponse): Promise<void> {
  suppressPlatformSessionEndedFor(15_000);
  accessTokenStore.set(response.accessToken);

  let permissions: Awaited<ReturnType<typeof getMyPermissions>>['permissions'] = [];
  let roles: Awaited<ReturnType<typeof getMyPermissions>>['roles'] = [];
  let sessionEmployee: Awaited<ReturnType<typeof getMyPermissions>>['sessionEmployee'] = null;

  try {
    const mine = await getMyPermissions();
    permissions = mine.permissions;
    roles = mine.roles ?? [];
    sessionEmployee = mine.sessionEmployee ?? null;
  } catch {
    // Session cookies + access token are already valid. Leave permissions empty
    // so the protected shell can load them without failing the TOTP UI.
  }

  armPostAuthBootstrap({
    accessToken: response.accessToken,
    admin: response.admin,
    session: sessionSummaryFromAuthResponse(response),
    permissions,
    roles,
    sessionEmployee: sessionEmployee ?? null,
  });
}
