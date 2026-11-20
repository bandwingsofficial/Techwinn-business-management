export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_OUTPUT_PX = 512;
export const PROFILE_IMAGE_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function normalizeProfileImageMime(mime: string): string {
  if (mime === 'image/jpg' || mime === '') return 'image/jpeg';
  return mime;
}

export function isAllowedProfileImageMime(mime: string): boolean {
  return PROFILE_IMAGE_ALLOWED_MIME.has(normalizeProfileImageMime(mime));
}

export const PROFILE_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export function pickProfileImageOutputMime(sourceMime: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (sourceMime === 'image/png') return 'image/png';
  if (sourceMime === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

export function extensionForProfileOutputMime(mime: 'image/jpeg' | 'image/png' | 'image/webp'): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}