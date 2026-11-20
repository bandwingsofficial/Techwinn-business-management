import {
  loadAuthorizedImageBlobUrl,
  requiresAuthorizedImageFetch,
} from '../authorized-image-cache';
import { isAllowedProfileImageMime, normalizeProfileImageMime } from './profile-image-constants';

export type ProfileImageEditorSource = {
  readonly src: string;
  readonly sourceMime: string;
  /** Blob URLs that must be revoked when the editor session ends (not shared authorized-cache URLs). */
  readonly ownedBlob: boolean;
};

async function mimeFromBlobUrl(src: string): Promise<string> {
  const blob = await fetch(src).then((response) => response.blob());
  const mime = normalizeProfileImageMime(blob.type || 'image/jpeg');
  if (!isAllowedProfileImageMime(mime)) {
    throw new Error('Unsupported image format.');
  }
  return mime;
}

/**
 * Loads a saved or in-form preview URL into a blob URL usable by the crop editor.
 */
export async function loadProfileImageEditorSource(
  previewUrl: string,
  resolveUrl?: (url: string) => string | null,
): Promise<ProfileImageEditorSource> {
  if (previewUrl.startsWith('blob:')) {
    const sourceMime = await mimeFromBlobUrl(previewUrl);
    return { src: previewUrl, sourceMime, ownedBlob: false };
  }

  const resolved = resolveUrl?.(previewUrl) ?? previewUrl;
  if (!resolved) {
    throw new Error('Could not resolve the profile image.');
  }

  if (requiresAuthorizedImageFetch(resolved)) {
    const src = await loadAuthorizedImageBlobUrl(resolved);
    const sourceMime = await mimeFromBlobUrl(src);
    return { src, sourceMime, ownedBlob: false };
  }

  if (resolved.startsWith('data:')) {
    const sourceMime = await mimeFromBlobUrl(resolved);
    return { src: resolved, sourceMime, ownedBlob: false };
  }

  const response = await fetch(resolved, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load the profile image.');
  }
  const blob = await response.blob();
  const sourceMime = normalizeProfileImageMime(blob.type || 'image/jpeg');
  if (!isAllowedProfileImageMime(sourceMime)) {
    throw new Error('Unsupported image format.');
  }
  const src = URL.createObjectURL(blob);
  return { src, sourceMime, ownedBlob: true };
}