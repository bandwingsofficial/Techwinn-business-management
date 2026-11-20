'use client';

import 'react-easy-crop/react-easy-crop.css';
import Cropper, { type Area } from 'react-easy-crop';
import { useCallback, useState } from 'react';
import { cn } from '@/shared/lib/utils';

export function ProfileImageCropper({
  imageSrc,
  crop,
  zoom,
  rotation,
  onCropChange,
  onZoomChange,
  onCropComplete,
  className,
}: {
  imageSrc: string;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (area: Area) => void;
  className?: string;
}) {
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);

  const onComplete = useCallback(
    (_: Area, areaPixels: Area) => {
      onCropComplete(areaPixels);
    },
    [onCropComplete],
  );

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg bg-slate-900',
        className,
      )}
      style={{ height: 'min(52vh, 360px)' }}
    >
      <Cropper
        image={imageSrc}
        crop={crop}
        zoom={zoom}
        rotation={rotation}
        aspect={1}
        cropShape="round"
        showGrid={false}
        restrictPosition
        minZoom={1}
        maxZoom={3}
        onCropChange={onCropChange}
        onZoomChange={onZoomChange}
        onCropComplete={onComplete}
        onMediaLoaded={(size) => setMediaSize({ width: size.naturalWidth, height: size.naturalHeight })}
        classes={{
          containerClassName: 'rounded-lg',
          cropAreaClassName:
            '!border-2 !border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]',
        }}
      />
      {mediaSize ? (
        <span className="sr-only">
          Source image {mediaSize.width} by {mediaSize.height} pixels
        </span>
      ) : null}
    </div>
  );
}