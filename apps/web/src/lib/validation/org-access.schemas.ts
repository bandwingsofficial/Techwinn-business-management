import { PERMISSION_KEYS, type PermissionKey } from '@techwin/contracts';
import { z } from 'zod';
import {
  coalesceOptionalPhoneField,
  leadEmailSchema,
  optionalStoredPhoneSchema,
} from './lead-contact';
import { platformNewPasswordSchema } from './platform-auth.schemas';

const uuid = z.string().uuid();
/** Must stay aligned with the full permission catalog — truncated enums drop HR/task keys on save. */
const permissionKeySchema = z.enum(
  PERMISSION_KEYS as unknown as [PermissionKey, ...PermissionKey[]],
);

export const organizationMembershipStatusSchema = z.enum([
  'ACTIVE',
  'INVITED',
  'SUSPENDED',
  'DEACTIVATED',
]);

export const organizationRoleStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const orgMemberListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().max(200).optional(),
    status: organizationMembershipStatusSchema.optional(),
    roleId: uuid.optional(),
    sortBy: z.enum(['displayName', 'email', 'joinedAt', 'updatedAt']).optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export function parseOrgMemberListQuery(input: unknown): z.infer<typeof orgMemberListQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const keys = ['page', 'pageSize', 'search', 'status', 'roleId', 'sortBy', 'sortDir'] as const;
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in record) picked[key] = record[key];
  }
  return orgMemberListQuerySchema.parse(picked);
}

export const inviteMemberRequestSchema = z
  .object({
    email: leadEmailSchema,
    displayName: z.string().trim().min(1).max(120).optional(),
    roleIds: z.array(uuid).min(1, 'Select at least one role.'),
  })
  .strict();

export const provisionMemberRequestSchema = z
  .object({
    email: leadEmailSchema,
    displayName: z.string().trim().min(1).max(120),
    phone: optionalStoredPhoneSchema,
    password: platformNewPasswordSchema,
    roleIds: z.array(uuid).min(1, 'Select at least one role.'),
    /** Required when assigning the organization Employee system role; links an existing profile. */
    employeeId: uuid.optional(),
  })
  .strict();

export const updateMemberRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    phone: optionalStoredPhoneSchema,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const resetMemberPasswordRequestSchema = z
  .object({
    password: platformNewPasswordSchema,
  })
  .strict();

export const changeMemberStatusRequestSchema = z
  .object({
    status: organizationMembershipStatusSchema,
  })
  .strict();

export const assignMemberRolesRequestSchema = z
  .object({
    roleIds: z.array(uuid),
  })
  .strict();

export const portalSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9-]*$/, 'Use lowercase letters, numbers, and hyphens.');

export const createRoleRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    portalSlug: portalSlugSchema,
    description: z.string().max(500).optional(),
    permissionKeys: z.array(permissionKeySchema),
  })
  .strict();

export const updateRoleRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    portalSlug: portalSlugSchema.optional(),
    description: z.string().max(500).optional(),
    status: organizationRoleStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const setRolePermissionsRequestSchema = z
  .object({
    permissionKeys: z.array(permissionKeySchema),
  })
  .strict();

export const acceptInvitationRequestSchema = z
  .object({
    acceptToken: z.string().min(32).max(128),
    displayName: z.string().trim().min(1).max(120),
    password: platformNewPasswordSchema,
  })
  .strict();

export type OrgMemberListQuery = z.infer<typeof orgMemberListQuerySchema>;
export type InviteMemberRequest = z.infer<typeof inviteMemberRequestSchema>;
export type ProvisionMemberRequest = z.infer<typeof provisionMemberRequestSchema>;
export type UpdateMemberRequest = z.infer<typeof updateMemberRequestSchema>;
export type ResetMemberPasswordRequest = z.infer<typeof resetMemberPasswordRequestSchema>;

function withCoalescedPhone(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  if (!('phone' in raw)) return raw;
  return {
    ...(raw as Record<string, unknown>),
    phone: coalesceOptionalPhoneField((raw as Record<string, unknown>).phone),
  };
}

export function parseProvisionMemberRequest(raw: unknown): ProvisionMemberRequest {
  return provisionMemberRequestSchema.parse(withCoalescedPhone(raw));
}

export function safeParseProvisionMemberRequest(raw: unknown) {
  return provisionMemberRequestSchema.safeParse(withCoalescedPhone(raw));
}

export function parseUpdateMemberRequest(raw: unknown): UpdateMemberRequest {
  return updateMemberRequestSchema.parse(withCoalescedPhone(raw));
}

export function parseResetMemberPasswordRequest(raw: unknown): ResetMemberPasswordRequest {
  return resetMemberPasswordRequestSchema.parse(raw);
}

export const orgAccessPermissionEventsQuerySchema = z.object({
  after: z.string().regex(/^\d+$/).optional(),
  waitMs: z.coerce.number().int().min(0).max(25_000).default(10_000),
});

export type OrgAccessPermissionEventsQuery = z.infer<typeof orgAccessPermissionEventsQuerySchema>;

export function parseOrgAccessPermissionEventsQuery(
  input: unknown,
): OrgAccessPermissionEventsQuery {
  return orgAccessPermissionEventsQuerySchema.parse(input);
}

export type ChangeMemberStatusRequest = z.infer<typeof changeMemberStatusRequestSchema>;
export type AssignMemberRolesRequest = z.infer<typeof assignMemberRolesRequestSchema>;
export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>;
export type SetRolePermissionsRequest = z.infer<typeof setRolePermissionsRequestSchema>;
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;
