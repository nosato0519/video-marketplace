import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createS3MediaStorage } from './s3-media-storage.js';

function response({ ok = true, status = 200, body = Readable.from(['video']), length = '5' } = {}) {
  return { ok, status, body, headers: new Headers({ 'content-length': length }) };
}

test('S3 adapter signs requests and forwards byte ranges', async () => {
  let captured;
  const storage = createS3MediaStorage({
    bucket: 'private-media',
    region: 'us-east-1',
    accessKeyId: 'AKIA_TEST',
    secretAccessKey: 'secret-test-key',
    endpoint: 'https://s3.example.test',
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options };
      return response({ length: '100' });
    },
  });

  const result = await storage.getStream({ storageKey: 'private/video file.mp4', range: { start: 10, end: 19 } });
  assert.equal(result.size, 100);
  assert.match(captured.url, /^https:\/\/s3\.example\.test\/private\/video%20file\.mp4$/);
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.headers.range, 'bytes=10-19');
  assert.equal(captured.options.headers['x-amz-content-sha256'], 'UNSIGNED-PAYLOAD');
  assert.match(captured.options.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIA_TEST\//);
});

test('S3 adapter supports metadata, upload, and delete through the same signed boundary', async () => {
  const calls = [];
  const storage = createS3MediaStorage({
    bucket: 'private-media',
    region: 'auto',
    accessKeyId: 'ACCESS',
    secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async (_url, options) => {
      calls.push(options);
      return response({ status: 200, length: options.method === 'HEAD' ? '42' : '0' });
    },
  });

  assert.deepEqual(await storage.getMetadata({ storageKey: 'private/a.mp4' }), { size: 42 });
  const stream = Readable.from([Buffer.from('video')]);
  await storage.putStream({ storageKey: 'private/a.mp4', stream });
  await storage.deleteObject({ storageKey: 'private/a.mp4' });

  assert.deepEqual(calls.map((call) => call.method), ['HEAD', 'PUT', 'DELETE']);
  assert.equal(calls[1].duplex, 'half');
});

test('S3 adapter rejects traversal keys before making a network request', async () => {
  let called = false;
  const storage = createS3MediaStorage({
    bucket: 'private-media', accessKeyId: 'ACCESS', secretAccessKey: 'SECRET',
    fetchImpl: async () => { called = true; return response(); },
  });

  await assert.rejects(storage.getStream({ storageKey: '../escape.mp4' }), /media_storage_key_invalid/);
  await assert.rejects(storage.getStream({ storageKey: '/absolute.mp4' }), /media_storage_key_invalid/);
  assert.equal(called, false);
});
