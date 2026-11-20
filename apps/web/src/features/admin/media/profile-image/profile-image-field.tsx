'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { revokeDeferredImagePreview } from '../components/image-upload-field';
import { ProfileImageEditorModal } from './profile-image-editor-modal';
import { ProfileImagePreview } from './profile-image-preview';
import {
  PROFILE_IMAGE_ACCEPT,
  PROFILE_IMAGE_MAX_BYTES,
  isAllowedProfileImageMime,
  normalizeProfileImageMime,
} from './profile-image-constants';
import { prepareProfileImageEditorSrc, revokeProfileImageEditorSrc } from './profile-image-crop-utils';

export type ProfileImageFieldValue = {
  readonly previewUrl: string | null;
  readonly pendingFile: File | null;
  readonly removed: boolean;
};

export type ProfileImageFieldState =
  | 'empty'
  | 'selecting'
  | 'editing'
  | 'pending'
  | 'saved'
  | 'error';

export function ProfileImageField({
  label,
  optional,
  disabled,
  value,
  onChange,
  renderAvatar,
  uploadLabel = 'Upload',
  changeLabel = 'Change Photo',
}: {
  label: string;
  optional?: boolean;
  disabled?: boolean;
  value: ProfileImageFieldValue;
  onChange: (next: ProfileImageFieldValue) => void;
  renderAvatar: (previewUrl: string | null) => ReactNode;
  uploadLabel?: string;
  changeLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [editorSourceMime, setEditorSourceMime] = useState('image/jpeg');
  const [selecting, setSelecting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const editorSessionRef = useRef<string | null>(null);

  const displayUrl = value.removed ? null : value.previewUrl;

  const clearEditorSession = useCallback(() => {
    if (editorSessionRef.current) {
      revokeProfileImageEditorSrc(editorSessionRef.current);
      editorSessionRef.current = null;
    }
    setEditorSrc(null);
  }, []);

  useEffect(() => () => clearEditorSession(), [clearEditorSession]);

  const openFilePicker = () => {
    if (disabled || selecting) return;
    inputRef.current?.click();
  };

  const onPickFile = async (file: File) => {
    setError(null);
    if (!isAllowedProfileImageMime(file.type)) {
      setError('Use a JPEG, PNG, or WebP image.');
      return;
    }
    const normalizedMime = normalizeProfileImageMime(file.type);
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    setSelecting(true);
    try {
      clearEditorSession();
      const src = await prepareProfileImageEditorSrc(file);
      editorSessionRef.current = src;
      setEditorSourceMime(normalizedMime || file.type);
      setEditorSrc(src);
      setEditorOpen(true);
    } catch {
      setError('Could not open the image. Try another file.');
    } finally {
      setSelecting(false);
    }
  };

  const onEditorSaved = (file: File, previewUrl: string) => {
    revokeDeferredImagePreview(value.previewUrl);
    clearEditorSession();
    setEditorOpen(false);
    onChange({ previewUrl, pendingFile: file, removed: false });
  };

  const onEditorDiscard = () => {
    clearEditorSession();
    setEditorOpen(false);
  };

  const removePhoto = () => {
    revokeDeferredImagePreview(value.previewUrl);
    clearEditorSession();
    setEditorOpen(false);
    onChange({ previewUrl: null, pendingFile: null, removed: true });
    setConfirmRemove(false);
  };

  const fieldState: ProfileImageFieldState = (() => {
    if (error) return 'error';
    if (selecting) return 'selecting';
    if (editorOpen) return 'editing';
    if (value.pendingFile) return 'pending';
    if (displayUrl) return 'saved';
    return 'empty';
  })();

  return (
    <>
      <CrmFormField label={label} optional={optional} error={error ?? undefined}>
        <div className="flex flex-wrap items-center gap-3">
          <ProfileImagePreview>{renderAvatar(displayUrl)}</ProfileImagePreview>

          <input
            ref={inputRef}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            className="sr-only"
            disabled={disabled || selecting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onPickFile(file);
              event.target.value = '';
            }}
          />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || selecting}
                onClick={openFilePicker}
              >
                {selecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Loading…
                  </>
                ) : displayUrl ? (
                  changeLabel
                ) : (
                  uploadLabel
                )}
              </Button>
              {displayUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || selecting}
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove Photo
                </Button>
              ) : null}
            </div>
            {value.pendingFile ? (
              <p className="text-muted-foreground text-xs" data-state={fieldState}>
                Cropped photo ready — save the employee form to upload.
              </p>
            ) : null}
          </div>
        </div>
      </CrmFormField>

      <ProfileImageEditorModal
        open={editorOpen && Boolean(editorSrc)}
        sourceMime={editorSourceMime}
        imageSrc={editorSrc}
        renderPreviewFallback={renderAvatar}
        onOpenChange={setEditorOpen}
        onSaved={onEditorSaved}
        onDiscard={onEditorDiscard}
      />

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
            <AlertDialogDescription>
              The photo will be cleared when you save this employee. You can add a new photo before saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep photo</AlertDialogCancel>
            <AlertDialogAction onClick={removePhoto}>Remove photo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}