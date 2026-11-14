'use client';

import {
  applyPermissionKeyChange,
  describeMissingViewPrerequisites,
  findMissingViewPrerequisites,
  isSuperAdminPortalSlug,
  rolePermissionSetsMatch,
  type PermissionKey,
} from '@techwin/contracts';
import {
  createRoleRequestSchema,
  setRolePermissionsRequestSchema,
  updateRoleRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import {
  clearFormFieldError,
  zodErrorToFieldMap,
} from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { cn } from '@/shared/lib/utils';
import {
  createOrgRole,
  getOrgRole,
  setOrgRolePermissions,
  updateOrgRole,
} from '../api/org-access';
import { invalidateMyPermissionsCache } from '../my-permissions-cache';
import type { OrganizationRoleStatus } from '../types';
import { applyOrgAccessFieldErrors, describeOrgAccessError } from '../utils/errors';
import { isEditableOrgRole } from '../utils/role-policy';
import { slugifyPortalSlug } from '../utils/portal-slug';
import { RolePermissionMatrix } from './role-permission-matrix';

const FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'sm:w-[min(820px,calc(100vw-2rem))] sm:max-w-[820px]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

type RoleFormState = {
  name: string;
  portalSlug: string;
  description: string;
  status: OrganizationRoleStatus;
  isSystem: boolean;
  permissionKeys: ReadonlySet<PermissionKey>;
};

function emptyForm(): RoleFormState {
  return {
    name: '',
    portalSlug: '',
    description: '',
    status: 'ACTIVE',
    isSystem: false,
    permissionKeys: new Set(),
  };
}

export function RoleFormDialog({
  open,
  roleId,
  readOnly,
  grantablePermissions,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  roleId: string | null;
  readOnly: boolean;
  grantablePermissions?: ReadonlySet<PermissionKey>;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const { refresh: refreshMyPermissions } = usePermissions();
  const isCreate = roleId === null;

  const [form, setForm] = useState<RoleFormState>(() => emptyForm());
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loadingRole, setLoadingRole] = useState(false);
  const [loadedEditable, setLoadedEditable] = useState(true);

  const effectiveReadOnly = readOnly || !loadedEditable;

  const resetCreate = useCallback(() => {
    setForm(emptyForm());
    setSlugManuallyEdited(false);
    setFieldErrors({});
    setLoadedEditable(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when opening create dialog
      resetCreate();
      return;
    }
    setLoadingRole(true);
    void getOrgRole(roleId)
      .then((role) => {
        setForm({
          name: role.name,
          portalSlug: role.portalSlug,
          description: role.description,
          status: role.status,
          isSystem: role.isSystem,
          permissionKeys: new Set(role.permissionKeys),
        });
        setSlugManuallyEdited(true);
        setFieldErrors({});
        setLoadedEditable(isEditableOrgRole(role));
      })
      .catch((failure) => toast.error(describeOrgAccessError(failure)))
      .finally(() => setLoadingRole(false));
  }, [open, roleId, isCreate, resetCreate, toast]);

  /** Authoritative selection for this editing session — exact keys, no template merge. */
  const permissionKeys = useMemo(
    () => [...form.permissionKeys],
    [form.permissionKeys],
  );

  const missingViewWarning = useMemo(
    () => describeMissingViewPrerequisites(permissionKeys),
    [permissionKeys],
  );

  const onSubmit = async () => {
    if (effectiveReadOnly) {
      onOpenChange(false);
      return;
    }
    setFieldErrors({});

    if (findMissingViewPrerequisites(permissionKeys).length > 0) {
      toast.error(
        describeMissingViewPrerequisites(permissionKeys) ??
          'Select View for each page before saving action permissions.',
      );
      return;
    }

    if (isCreate) {
      const parsed = createRoleRequestSchema.safeParse({
        name: form.name.trim(),
        portalSlug: form.portalSlug.trim(),
        description: form.description.trim() || undefined,
        permissionKeys,
      });
      if (!parsed.success) {
        setFieldErrors(zodErrorToFieldMap(parsed.error));
        toast.error('Fix the highlighted fields before saving.');
        focusFirstInvalidField();
        return;
      }
      try {
        const created = await run(() => createOrgRole(parsed.data));
        if (!created) return;

        if (
          !rolePermissionSetsMatch(parsed.data.permissionKeys, created.permissionKeys)
        ) {
          const expected = new Set(parsed.data.permissionKeys);
          const actual = new Set(created.permissionKeys);
          const missing = [...expected].filter((key) => !actual.has(key));
          const extra = [...actual].filter((key) => !expected.has(key));
          const detail = [
            missing.length > 0 ? `missing: ${missing.slice(0, 5).join(', ')}` : null,
            extra.length > 0 ? `unexpected: ${extra.slice(0, 5).join(', ')}` : null,
          ]
            .filter(Boolean)
            .join('; ');
          toast.error(
            detail
              ? `Role save did not persist the selected permissions (${detail}). Refresh and try again.`
              : 'Role save did not persist the selected permissions. Refresh and try again.',
          );
          setForm((current) => ({
            ...current,
            permissionKeys: new Set(created.permissionKeys),
          }));
          return;
        }

        setForm((current) => ({
          ...current,
          permissionKeys: new Set(created.permissionKeys),
        }));
        toast.success('Role saved.');
        invalidateMyPermissionsCache();
        await refreshMyPermissions();
        onOpenChange(false);
        await onSaved();
      } catch (failure) {
        if (!applyOrgAccessFieldErrors(failure, setFieldErrors)) {
          toast.error(describeOrgAccessError(failure));
        }
      }
      return;
    }

    const metadataParsed = updateRoleRequestSchema.safeParse({
      name: form.name.trim(),
      ...(!isSuperAdminPortalSlug(form.portalSlug)
        ? { portalSlug: form.portalSlug.trim() }
        : {}),
      description: form.description.trim(),
      status: form.status,
    });
    if (!metadataParsed.success) {
      setFieldErrors(zodErrorToFieldMap(metadataParsed.error));
      toast.error('Fix the highlighted fields before saving.');
      focusFirstInvalidField();
      return;
    }

    const permissionsParsed = setRolePermissionsRequestSchema.safeParse({ permissionKeys });
    if (!permissionsParsed.success) {
      setFieldErrors(zodErrorToFieldMap(permissionsParsed.error));
      toast.error('One or more selected permissions are invalid and cannot be saved.');
      focusFirstInvalidField();
      return;
    }

    try {
      const saved = await run(async () => {
        await updateOrgRole(roleId, metadataParsed.data);
        return setOrgRolePermissions(roleId, permissionsParsed.data);
      });
      if (!saved) return;

      if (
        !rolePermissionSetsMatch(permissionsParsed.data.permissionKeys, saved.permissionKeys)
      ) {
        const expected = new Set(permissionsParsed.data.permissionKeys);
        const actual = new Set(saved.permissionKeys);
        const missing = [...expected].filter((key) => !actual.has(key));
        const extra = [...actual].filter((key) => !expected.has(key));
        const detail = [
          missing.length > 0 ? `missing: ${missing.slice(0, 5).join(', ')}` : null,
          extra.length > 0 ? `unexpected: ${extra.slice(0, 5).join(', ')}` : null,
        ]
          .filter(Boolean)
          .join('; ');
        toast.error(
          detail
            ? `Role save did not persist the selected permissions (${detail}). Refresh and try again.`
            : 'Role save did not persist the selected permissions. Refresh and try again.',
        );
        setForm((current) => ({
          ...current,
          permissionKeys: new Set(saved.permissionKeys),
        }));
        return;
      }

      setForm((current) => ({
        ...current,
        permissionKeys: new Set(saved.permissionKeys),
      }));
      toast.success('Role saved.');
      invalidateMyPermissionsCache();
      await refreshMyPermissions();
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      if (!applyOrgAccessFieldErrors(failure, setFieldErrors)) {
        toast.error(describeOrgAccessError(failure));
      }
    }
  };

  const title = isCreate
    ? 'Create role'
    : effectiveReadOnly
      ? 'View role'
      : 'Edit role';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {loadingRole ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading role…
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Basic information
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2 sm:gap-4">
                    <div className="grid gap-2">
                      <CrmFieldLabel htmlFor="role-name" required={isCreate && !effectiveReadOnly}>
                        Role name
                      </CrmFieldLabel>
                      <Input
                        id="role-name"
                        value={form.name}
                        disabled={pending || effectiveReadOnly}
                        aria-invalid={Boolean(fieldErrors.name)}
                        className={cn(
                          CRM_PIPELINE_FORM_FIELD_CLASS,
                          formControlStateClass(fieldErrors.name ? 'invalid' : 'neutral'),
                        )}
                        onChange={(event) => {
                          clearFormFieldError(setFieldErrors, 'name');
                          const next = event.target.value;
                          setForm((current) => ({
                            ...current,
                            name: next,
                            portalSlug:
                              isCreate && !slugManuallyEdited
                                ? slugifyPortalSlug(next)
                                : current.portalSlug,
                          }));
                        }}
                      />
                      <CrmInlineFieldError message={fieldErrors.name} reserveSpace={false} />
                    </div>
                    <div className="grid gap-2">
                      <CrmFieldLabel htmlFor="role-portal-slug" required={isCreate && !effectiveReadOnly}>
                        Portal URL slug
                      </CrmFieldLabel>
                      <Input
                        id="role-portal-slug"
                        value={form.portalSlug}
                        disabled={
                          pending ||
                          effectiveReadOnly ||
                          (isSuperAdminPortalSlug(form.portalSlug) && !isCreate)
                        }
                        readOnly={isSuperAdminPortalSlug(form.portalSlug) && !isCreate}
                        aria-invalid={Boolean(fieldErrors.portalSlug)}
                        className={cn(
                          CRM_PIPELINE_FORM_FIELD_CLASS,
                          formControlStateClass(fieldErrors.portalSlug ? 'invalid' : 'neutral'),
                        )}
                        onChange={(event) => {
                          clearFormFieldError(setFieldErrors, 'portalSlug');
                          setSlugManuallyEdited(true);
                          setForm((current) => ({ ...current, portalSlug: event.target.value }));
                        }}
                      />
                      <CrmInlineFieldError message={fieldErrors.portalSlug} reserveSpace={false} />
                    </div>
                  </div>
                  {!isCreate && !effectiveReadOnly ? (
                    <div className="grid gap-2 sm:col-span-2 sm:max-w-xs">
                      <CrmFieldLabel htmlFor="role-status">Status</CrmFieldLabel>
                      <Select
                        value={form.status}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            status: value as OrganizationRoleStatus,
                          }))
                        }
                        disabled={pending}
                      >
                        <SelectTrigger id="role-status" className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:col-span-2">
                    <CrmFieldLabel htmlFor="role-description" optional>
                      Description
                    </CrmFieldLabel>
                    <Textarea
                      id="role-description"
                      rows={3}
                      value={form.description}
                      disabled={pending || effectiveReadOnly}
                      aria-invalid={Boolean(fieldErrors.description)}
                      className={cn(
                        CRM_PIPELINE_FORM_TEXTAREA_CLASS,
                        formControlStateClass(fieldErrors.description ? 'invalid' : 'neutral'),
                      )}
                      onChange={(event) => {
                        clearFormFieldError(setFieldErrors, 'description');
                        setForm((current) => ({ ...current, description: event.target.value }));
                      }}
                    />
                    <CrmInlineFieldError message={fieldErrors.description} reserveSpace={false} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Permissions
                </p>
                <RolePermissionMatrix
                  matrixKey={`${open}-${roleId ?? 'create'}`}
                  selected={form.permissionKeys}
                  readOnly={effectiveReadOnly || pending}
                  grantable={grantablePermissions}
                  onToggle={(key, checked) => {
                    setForm((current) => ({
                      ...current,
                      permissionKeys: new Set(
                        applyPermissionKeyChange(current.permissionKeys, key, checked, grantablePermissions),
                      ),
                    }));
                    clearFormFieldError(setFieldErrors, 'permissionKeys');
                  }}
                  onReplaceSelection={(keys) => {
                    setForm((current) => ({
                      ...current,
                      permissionKeys: new Set(keys),
                    }));
                    clearFormFieldError(setFieldErrors, 'permissionKeys');
                  }}
                />
                {missingViewWarning && !effectiveReadOnly ? (
                  <Alert>
                    <AlertDescription>{missingViewWarning}</AlertDescription>
                  </Alert>
                ) : null}
                <CrmInlineFieldError message={fieldErrors.permissionKeys} reserveSpace={false} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {effectiveReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!effectiveReadOnly ? (
            <Button
              type="button"
              className={cn('h-11 px-5', FORM_PRIMARY_BTN)}
              disabled={pending || loadingRole}
              onClick={() => void onSubmit()}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {isCreate ? 'Creating…' : 'Saving…'}
                </>
              ) : isCreate ? (
                'Create role'
              ) : (
                'Save role'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
