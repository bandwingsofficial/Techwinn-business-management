import { Eye, SquarePen, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import type { CrmServicePackage } from '../types/service-package.types';

type ServicePackageActionsProps = {
  pkg: CrmServicePackage;
  disabled?: boolean;
  canViewDetails?: boolean;
  canStatus?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onToggleStatus: (pkg: CrmServicePackage) => void;
  onView: (pkg: CrmServicePackage) => void;
  onEdit: (pkg: CrmServicePackage) => void;
  onDelete: (pkg: CrmServicePackage) => void;
};

/** Row actions: view, status, edit, delete — each gated independently. */
export function ServicePackageActions({
  pkg,
  disabled,
  canViewDetails = false,
  canStatus = false,
  canEdit = false,
  canDelete = false,
  onToggleStatus,
  onView,
  onEdit,
  onDelete,
}: ServicePackageActionsProps) {
  if (!canViewDetails && !canStatus && !canEdit && !canDelete) {
    return null;
  }

  return (
    <div className="flex w-full shrink-0 items-center justify-end gap-1">
      {canViewDetails ? (
        <TableIconButton label={`View ${pkg.name}`} disabled={disabled} onClick={() => onView(pkg)}>
          <Eye className="size-4 stroke-[2]" aria-hidden="true" />
        </TableIconButton>
      ) : null}
      {canStatus ? (
        <TableIconButton
          label={
            pkg.status === 'ACTIVE' ? `Deactivate ${pkg.name}` : `Activate ${pkg.name}`
          }
          tone="default"
          className={
            pkg.status === 'ACTIVE'
              ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
              : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
          }
          disabled={disabled}
          onClick={() => onToggleStatus(pkg)}
        >
          {pkg.status === 'ACTIVE' ? (
            <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
          ) : (
            <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
          )}
        </TableIconButton>
      ) : null}
      {canEdit ? (
        <TableIconButton
          label={`Edit ${pkg.name}`}
          tone="default"
          className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
          disabled={disabled}
          onClick={() => onEdit(pkg)}
        >
          <SquarePen className="size-4 stroke-[2]" aria-hidden="true" />
        </TableIconButton>
      ) : null}
      {canDelete ? (
        <TableIconButton
          label={`Delete ${pkg.name}`}
          tone="default"
          className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
          disabled={disabled}
          onClick={() => onDelete(pkg)}
        >
          <Trash2 className="size-4 stroke-[2]" aria-hidden="true" />
        </TableIconButton>
      ) : null}
    </div>
  );
}
