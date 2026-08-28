import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaSignatureMatches, requiredSignatureBytes } from './media-upload-validation.js';

test('recognizes an MP4 ftyp signature', () => {
  const bytes = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  assert.equal(mediaSignatureMatches('video/mp4', bytes), true);
});

test('rejects a fake MP4 body with no ftyp signature', () => {
  assert.equal(mediaSignatureMatches('video/mp4', Buffer.from('not-an-mp4')), false);
});

test('recognizes EBML signatures used by WebM and Matroska', () => {
  const bytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x93]);
  assert.equal(mediaSignatureMatches('video/webm', bytes), true);
  assert.equal(mediaSignatureMatches('video/x-matroska', bytes), true);
});

test('reports the minimum bytes needed for signature inspection', () => {
  assert.equal(requiredSignatureBytes('video/mp4'), 8);
  assert.equal(requiredSignatureBytes('video/webm'), 4);
});
