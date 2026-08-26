import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaStorage } from './media-storage.js';

test('media storage delegates stream access without exposing storage implementation', async () => {
  const calls = [];
  const storage = createMediaStorage({
    getObjectStream: async ({ storageKey }) => { calls.push(['stream', storageKey]); return { stream: true }; },
    getObjectMetadata: async ({ storageKey }) => { calls.push(['metadata', storageKey]); return { contentType: 'video/mp4' }; },
  });

  assert.deepEqual(await storage.getStream({ storageKey: 'private/video.mp4' }), { stream: true });
  assert.deepEqual(await storage.getMetadata({ storageKey: 'private/video.mp4' }), { contentType: 'video/mp4' });
  assert.deepEqual(calls, [['stream', 'private/video.mp4'], ['metadata', 'private/video.mp4']]);
});

test('media storage refuses missing storage keys', async () => {
  const storage = createMediaStorage({ getObjectStream: async () => ({}), getObjectMetadata: async () => ({}) });
  await assert.rejects(storage.getStream({ storageKey: '' }), /media_storage_key_missing/);
  await assert.rejects(storage.getMetadata({ storageKey: '' }), /media_storage_key_missing/);
});
