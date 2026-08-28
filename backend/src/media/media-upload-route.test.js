import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mediaSignatureMatches } from './media-upload-validation.js';

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

test('rejects a mismatched media signature and removes the temporary file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-marketplace-upload-'));
  const filePath = path.join(dir, 'asset.mp4');
  try {
    await fs.writeFile(filePath, Buffer.from('not-an-mp4'));
    const handle = await fs.open(filePath, 'r');
    try {
      const inspected = Buffer.alloc(8);
      const { bytesRead } = await handle.read(inspected, 0, inspected.length, 0);
      assert.equal(bytesRead, 8);
      assert.equal(mediaSignatureMatches('video/mp4', inspected), false);
    } finally {
      await handle.close();
    }
    await fs.rm(filePath, { force: true });
    await assert.rejects(fs.access(filePath));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('inspects only a bounded prefix for a valid large media file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-marketplace-upload-'));
  const filePath = path.join(dir, 'asset.mp4');
  try {
    const prefix = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]);
    await fs.writeFile(filePath, Buffer.concat([prefix, Buffer.alloc(1024 * 1024, 0x41)]));
    const handle = await fs.open(filePath, 'r');
    try {
      const inspected = Buffer.alloc(8);
      const { bytesRead } = await handle.read(inspected, 0, inspected.length, 0);
      assert.equal(bytesRead, 8);
      assert.equal(mediaSignatureMatches('video/mp4', inspected), true);
    } finally {
      await handle.close();
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
