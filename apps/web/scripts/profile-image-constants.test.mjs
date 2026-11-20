import test from 'node:test';
import assert from 'node:assert/strict';

function normalizeProfileImageMime(mime) {
  if (mime === 'image/jpg' || mime === '') return 'image/jpeg';
  return mime;
}

function pickProfileImageOutputMime(sourceMime) {
  if (sourceMime === 'image/png') return 'image/png';
  if (sourceMime === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

function extensionForProfileOutputMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function isAllowedProfileImageMime(mime) {
  return ALLOWED.has(normalizeProfileImageMime(mime));
}

test('normalizeProfileImageMime maps jpg alias', () => {
  assert.equal(normalizeProfileImageMime('image/jpg'), 'image/jpeg');
  assert.equal(normalizeProfileImageMime('image/png'), 'image/png');
});

test('isAllowedProfileImageMime accepts jpeg png webp only', () => {
  assert.equal(isAllowedProfileImageMime('image/jpeg'), true);
  assert.equal(isAllowedProfileImageMime('image/jpg'), true);
  assert.equal(isAllowedProfileImageMime('image/gif'), false);
});

test('pickProfileImageOutputMime preserves transparency formats', () => {
  assert.equal(pickProfileImageOutputMime('image/png'), 'image/png');
  assert.equal(pickProfileImageOutputMime('image/webp'), 'image/webp');
  assert.equal(pickProfileImageOutputMime('image/jpeg'), 'image/jpeg');
});

test('extensionForProfileOutputMime', () => {
  assert.equal(extensionForProfileOutputMime('image/png'), 'png');
  assert.equal(extensionForProfileOutputMime('image/webp'), 'webp');
  assert.equal(extensionForProfileOutputMime('image/jpeg'), 'jpg');
});