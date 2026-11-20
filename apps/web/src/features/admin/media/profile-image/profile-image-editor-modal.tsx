'use client';

import type { Area } from 'react-easy-crop';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/shared/lib/utils';
import { ProfileImageCropper } from './profile-image-cropper';
import {
  ProfileImageEditorControls,
  ProfileImageEditorFooter,
} from './profile-image-actions';
import { ProfileImagePreview } from './profile-image-preview';
import { Button } from '@/components/ui/button';
import { renderCroppedProfileImage, revokeProfileImageEditorSrc } from './profile-image-crop-utils';

export function ProfileImageEditorModal({
  open,
  sourceMime,
  imageSrc,
  onOpenChange,
  onSaved,
  onDiscard,
  renderPreviewFallback,
  onChooseDifferentPhoto,
}: {
  open: boolean;
  sourceMime: string;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (file: File, previewUrl: string) => void;
  onDiscard: () => void;
  renderPreviewFallback: (previewUrl: string | null) => ReactNode;
  onChooseDifferentPhoto?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : undefined)}>
      {open && imageSrc ? (
        <ProfileImageEditorModalWorkspace
          key={imageSrc}
          imageSrc={imageSrc}
          sourceMime={sourceMime}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
          onDiscard={onDiscard}
          renderPreviewFallback={renderPreviewFallback}
          onChooseDifferentPhoto={onChooseDifferentPhoto}
        />
      ) : null}
    </Dialog>
  );
}

function ProfileImageEditorModalWorkspace({
  imageSrc,
  sourceMime,
  onOpenChange,
  onSaved,
  onDiscard,
  renderPreviewFallback,
  onChooseDifferentPhoto,
}: {
  imageSrc: string;
  sourceMime: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (file: File, previewUrl: string) => void;
  onDiscard: () => void;
  renderPreviewFallback: (previewUrl: string | null) => ReactNode;
  onChooseDifferentPhoto?: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [userAdjusted, setUserAdjusted] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = userAdjusted;

  useEffect(() => {
    if (!croppedAreaPixels) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void renderCroppedProfileImage(imageSrc, croppedAreaPixels, rotation, sourceMime)
        .then((processed) => {
          const url = URL.createObjectURL(processed.file);
          setLivePreviewUrl((current) => {
            revokeProfileImageEditorSrc(current);
            return url;
          });
        })
        .catch(() => {
          // live preview is best-effort; save still validates
        });
    }, 180);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [croppedAreaPixels, imageSrc, rotation, sourceMime]);

  useEffect(
    () => () => {
      revokeProfileImageEditorSrc(livePreviewUrl);
    },
    [livePreviewUrl],
  );

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setUserAdjusted(false);
  }, []);

  const onCropChange = useCallback((next: { x: number; y: number }) => {
    setUserAdjusted(true);
    setCrop(next);
  }, []);

  const onZoomChange = useCallback((next: number) => {
    setUserAdjusted(true);
    setZoom(next);
  }, []);

  const requestClose = useCallback(() => {
    if (processing) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onDiscard();
    onOpenChange(false);
  }, [dirty, onDiscard, onOpenChange, processing]);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels || processing) return;
    setError(null);
    setProcessing(true);
    try {
      const processed = await renderCroppedProfileImage(
        imageSrc,
        croppedAreaPixels,
        rotation,
        sourceMime,
      );
      const previewUrl = URL.createObjectURL(processed.file);
      onSaved(processed.file, previewUrl);
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the image.');
    } finally {
      setProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, onOpenChange, onSaved, processing, rotation, sourceMime]);

  return (
    <>
      <DialogContent
        className={cn(
          'z-[60] flex max-h-[calc(100dvh-32px)] max-w-[min(640px,calc(100vw-24px))] flex-col gap-4 overflow-hidden p-4 sm:p-5',
          '[&_[data-slot=dialog-close]]:hidden',
        )}
      >
        <DialogHeader>
          <DialogTitle>Edit Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
          <ProfileImageCropper
            imageSrc={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={setCroppedAreaPixels}
          />

          <ProfileImageEditorControls
            zoom={zoom}
            disabled={processing}
            onZoomChange={onZoomChange}
            onRotateLeft={() => {
              setUserAdjusted(true);
              setRotation((value) => value - 90);
            }}
            onRotateRight={() => {
              setUserAdjusted(true);
              setRotation((value) => value + 90);
            }}
            onReset={handleReset}
            onCenter={() => {
              setUserAdjusted(true);
              setCrop({ x: 0, y: 0 });
            }}
          />

          {onChooseDifferentPhoto ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={processing}
                onClick={onChooseDifferentPhoto}
              >
                Choose different photo
              </Button>
            </div>
          ) : null}

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <ProfileImagePreview className="size-14" label="Final circular preview">
              {renderPreviewFallback(livePreviewUrl)}
            </ProfileImagePreview>
            <p className="text-muted-foreground text-xs leading-snug">
              Preview matches the square image that will be uploaded as your profile photo.
            </p>
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}{' '}
              <button type="button" className="underline" onClick={() => void handleSave()}>
                Retry
              </button>
            </p>
          ) : null}
        </div>

        <ProfileImageEditorFooter
          processing={processing}
          saveDisabled={!croppedAreaPixels}
          onCancel={requestClose}
          onSave={() => void handleSave()}
        />
      </DialogContent>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your crop and adjustments have not been saved. The previous profile photo will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDiscard(false)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onDiscard();
                onOpenChange(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}