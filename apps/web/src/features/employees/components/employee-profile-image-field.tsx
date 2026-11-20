'use client';

import {
  ProfileImageField,
  type ProfileImageFieldValue,
} from '@/features/admin/media/profile-image/profile-image-field';
import {
  revokeDeferredImagePreview,
  type DeferredImageUploadValue,
} from '@/features/admin/media/components/image-upload-field';
import { EmployeeAvatar } from './employee-avatar';
import { resolveEmployeeProfileImageSrc } from '../utils/profile-image';

export type EmployeeProfileImageFormValue = {
  /** Saved server preview path (edit mode). */
  readonly savedPreviewUrl: string | null;
  readonly localPreviewUrl: string | null;
  readonly pendingFile: File | null;
  readonly removeOnSave: boolean;
};

export function employeeProfileImageDisplayUrl(value: EmployeeProfileImageFormValue): string | null {
  if (value.localPreviewUrl) return value.localPreviewUrl;
  if (value.removeOnSave) return null;
  return value.savedPreviewUrl;
}

export function employeeProfileImageToDeferred(value: EmployeeProfileImageFormValue): DeferredImageUploadValue {
  return {
    previewUrl: employeeProfileImageDisplayUrl(value),
    pendingFile: value.pendingFile,
    removed: value.removeOnSave,
  };
}

export function employeeProfileImageToFieldValue(
  value: EmployeeProfileImageFormValue,
): ProfileImageFieldValue {
  return {
    previewUrl: employeeProfileImageDisplayUrl(value),
    pendingFile: value.pendingFile,
    removed: value.removeOnSave,
  };
}

export function EmployeeProfileImageField({
  displayName,
  value,
  onChange,
  disabled,
}: {
  displayName: string;
  value: EmployeeProfileImageFormValue;
  onChange: (next: EmployeeProfileImageFormValue) => void;
  disabled?: boolean;
}) {
  return (
    <ProfileImageField
      label="Profile image"
      optional
      disabled={disabled}
      value={employeeProfileImageToFieldValue(value)}
      uploadLabel="Upload"
      changeLabel="Change Photo"
      resolveImageUrl={resolveEmployeeProfileImageSrc}
      renderAvatar={(previewUrl) => (
        <EmployeeAvatar displayName={displayName} profileImageUrl={previewUrl} lazyLoad={false} />
      )}
      onChange={(next) => {
        if (next.removed) {
          revokeDeferredImagePreview(value.localPreviewUrl);
          onChange({
            savedPreviewUrl: value.savedPreviewUrl,
            localPreviewUrl: null,
            pendingFile: null,
            removeOnSave: true,
          });
          return;
        }
        if (next.pendingFile && next.previewUrl?.startsWith('blob:')) {
          revokeDeferredImagePreview(value.localPreviewUrl);
          onChange({
            savedPreviewUrl: value.savedPreviewUrl,
            localPreviewUrl: next.previewUrl,
            pendingFile: next.pendingFile,
            removeOnSave: false,
          });
        }
      }}
    />
  );
}