import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createMediaStorage } from './media-storage.js';

test('media storage delegates read, write, and delete operations without exposing storage implementation', async () => {
  const calls = [];
  const storage = createMediaStorage({
    getObjectStream: async ({ storageKey }) => { calls.push(['stream', storageKey]); return { stream: true }; },
    getObjectMetadata: async ({ storageKey }) => { calls.push(['metadata', storageKey]); return { contentType: 'video/mp4' }; },
    putObjectStream: async ({ storageKey, stream }) => { calls.push(['put', storageKey, stream]); return { size: 10 }; },
    deleteObject: async ({ storageKey }) => { calls.push(['delete', storageKey]); },
  });

  assert.deepEqual(await storage.getStream({ storageKey: 'private/video.mp4' }), { stream: true });
  assert.deepEqual(await storage.getMetadata({ storageKey: 'private/video.mp4' }), { contentType: 'video/mp4' });
  assert.deepEqual(await storage.putStream({ storageKey: 'private/video.mp4', stream: Readable.from(['video']) }), { size: 10 });
  await storage.deleteObject({ storageKey: 'private/video.mp4' });
  assert.equal(calls[2][0], 'put');
  assert.deepEqual(calls[3], ['delete', 'private/video.mp4']);
});

test('media storage refuses missing storage keys and upload streams', async () => {
  const storage = createMediaStorage({ getObjectStream: async () => ({}), getObjectMetadata: async () => ({}), putObjectStream: async () => ({}), deleteObject: async () => {} });
  await assert.rejects(storage.getStream({ storageKey: '' }), /media_storage_key_missing/);
  await assert.rejects(storage.getMetadata({ storageKey: '' }), /media_storage_key_missing/);
  await assert.rejects(storage.putStream({ storageKey: 'video.mp4' }), /media_storage_stream_missing/);
  await assert.rejects(storage.deleteObject({ storageKey: '' }), /media_storage_key_missing/);
});
