import { Inject, Injectable } from '@nestjs/common';
import { hasUnrestrictedOrgPermissions, type PermissionKey } from '#contracts';
import type { OrgAccessActor } from '../shared/org-access-actor.js';
import { OrgAccessForbiddenError } from '../../domain/errors/org-access.errors.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';

@Injectable()
export class PermissionCheckerService {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly orgAccess: OrgAccessRepository,
  ) {}

  async resolveEffectivePermissions(actor: OrgAccessActor): Promise<readonly PermissionKey[]> {
    await this.orgAccess.assertActiveMembership(actor.organizationId, actor.adminId);
    const permissions = await this.orgAccess.resolveEffectivePermissions(
      actor.organizationId,
      actor.adminId,
      actor.isPlatformSuperAdmin,
    );
    return permissions as readonly PermissionKey[];
  }

  async hasAllPermissions(
    actor: OrgAccessActor,
    required: readonly PermissionKey[],
  ): Promise<boolean> {
    if (required.length === 0) return true;
    const effective = await this.resolveEffectivePermissions(actor);
    if (actor.isPlatformSuperAdmin || hasUnrestrictedOrgPermissions(effective)) return true;
    const granted = new Set(effective);
    return required.every((key) => granted.has(key));
  }

  async hasAnyPermission(
    actor: OrgAccessActor,
    keys: readonly PermissionKey[],
  ): Promise<boolean> {
    if (keys.length === 0) return true;
    const effective = await this.resolveEffectivePermissions(actor);
    if (actor.isPlatformSuperAdmin || hasUnrestrictedOrgPermissions(effective)) return true;
    const granted = new Set(effective);
    return keys.some((key) => granted.has(key));
  }

  /** Grants when the actor holds any of `required`. */
  async requirePermissions(
    actor: OrgAccessActor,
    required: readonly PermissionKey[],
  ): Promise<void> {
    if (required.length === 0) return;
    const effective = await this.resolveEffectivePermissions(actor);
    if (actor.isPlatformSuperAdmin || hasUnrestrictedOrgPermissions(effective)) return;
    const granted = new Set(effective);
    const allowed = required.some((key) => granted.has(key));
    if (!allowed) {
      throw new OrgAccessForbiddenError('You do not have permission to perform this action.');
    }
  }
}
