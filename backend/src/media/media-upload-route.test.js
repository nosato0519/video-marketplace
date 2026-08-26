import test from 'node:test';
import assert from 'node:assert/strict';

const allowed = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

function validateUpload({ role, mime, size }) {
  if (role !== 'seller') return 'seller_required';
  if (!allowed.has(mime)) return 'unsupported_media_type';
  if (size > MAX_BYTES) return 'media_too_large';
  return null;
}

test('rejects non-sellers', () => {
  assert.equal(validateUpload({ role: 'buyer', mime: 'video/mp4', size: 100 }), 'seller_required');
});

test('rejects unsupported media types', () => {
  assert.equal(validateUpload({ role: 'seller', mime: 'application/pdf', size: 100 }), 'unsupported_media_type');
});

test('rejects files larger than the configured 5GB default limit', () => {
  assert.equal(validateUpload({ role: 'seller', mime: 'video/mp4', size: MAX_BYTES + 1 }), 'media_too_large');
});

test('accepts supported video under the limit', () => {
  assert.equal(validateUpload({ role: 'seller', mime: 'video/mp4', size: 1024 }), null);
});
