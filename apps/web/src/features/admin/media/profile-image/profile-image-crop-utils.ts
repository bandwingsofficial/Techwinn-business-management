import type { Area, Point } from 'react-easy-crop';
import {
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_OUTPUT_PX,
  extensionForProfileOutputMime,
  pickProfileImageOutputMime,
} from './profile-image-constants';

export type ProfileImageCropTransform = {
  readonly crop: Point;
  readonly zoom: number;
  readonly rotation: number;
  readonly croppedAreaPixels: Area | null;
};

export type ProfileImageProcessedResult = {
  readonly file: File;
  readonly width: number;
  readonly height: number;
  readonly mimeType: string;
  readonly byteLength: number;
};

function revokeBlobUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function revokeProfileImageEditorSrc(src: string | null | undefined): void {
  revokeBlobUrl(src);
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load the image.')));
    image.src = url;
  });
}

function toRadian(degree: number): number {
  return (degree * Math.PI) / 180;
}

function rotatedBounds(width: number, height: number, rotation: number): { width: number; height: number } {
  const rad = toRadian(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Normalize EXIF orientation via createImageBitmap when available, else use the raw file URL.
 */
export async function prepareProfileImageEditorSrc(file: File): Promise<string> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available.');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Could not prepare the image.'))),
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          file.type === 'image/png' ? undefined : 0.92,
        );
      });
      return URL.createObjectURL(blob);
    } catch {
      // fall through to direct object URL
    }
  }
  return URL.createObjectURL(file);
}

export async function renderCroppedProfileImage(
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation: number,
  sourceMime: string,
  outputSize = PROFILE_IMAGE_OUTPUT_PX,
): Promise<ProfileImageProcessedResult> {
  const image = await loadHtmlImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  const rot = ((rotation % 360) + 360) % 360;
  const bounds = rotatedBounds(image.width, image.height, rot);
  const maxCanvas = document.createElement('canvas');
  maxCanvas.width = bounds.width;
  maxCanvas.height = bounds.height;
  const maxCtx = maxCanvas.getContext('2d');
  if (!maxCtx) throw new Error('Canvas is not available.');

  maxCtx.translate(bounds.width / 2, bounds.height / 2);
  maxCtx.rotate(toRadian(rot));
  maxCtx.translate(-image.width / 2, -image.height / 2);
  maxCtx.drawImage(image, 0, 0);

  canvas.width = outputSize;
  canvas.height = outputSize;
  ctx.drawImage(
    maxCanvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  const outputMime = pickProfileImageOutputMime(sourceMime);
  const quality = outputMime === 'image/jpeg' ? 0.92 : undefined;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Could not export the cropped image.'))),
      outputMime,
      quality,
    );
  });

  if (blob.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error('Cropped image is too large. Zoom in or use a smaller source file.');
  }

  const ext = extensionForProfileOutputMime(outputMime);
  const file = new File([blob], `profile.${ext}`, { type: outputMime });

  return {
    file,
    width: outputSize,
    height: outputSize,
    mimeType: outputMime,
    byteLength: blob.size,
  };
}

export function defaultProfileCropTransform(): ProfileImageCropTransform {
  return { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, croppedAreaPixels: null };
}