import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaStorage } from './media-storage.js';

test('media storage forwards a validated range to the provider', async () => {
  let received;
  const storage = createMediaStorage({
    getObjectStream: async (input) => { received = input; return { stream: { pipe() {} } }; },
    getObjectMetadata: async () => ({ contentType: 'video/mp4' }),
  });

  await storage.getStream({ storageKey: 'private/video.mp4', range: { start: 100, end: 199 } });
  assert.deepEqual(received, { storageKey: 'private/video.mp4', range: { start: 100, end: 199 } });
});

test('media storage rejects an invalid range before calling the provider', async () => {
  let called = false;
  const storage = createMediaStorage({
    getObjectStream: async () => { called = true; return { stream: {} }; },
    getObjectMetadata: async () => ({}),
  });

  await assert.rejects(
    storage.getStream({ storageKey: 'private/video.mp4', range: { start: 200, end: 100 } }),
    /media_storage_range_invalid/
  );
  assert.equal(called, false);
});
