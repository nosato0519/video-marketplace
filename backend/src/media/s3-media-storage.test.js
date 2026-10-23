import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createS3MediaStorage } from './s3-media-storage.js';

function response({ ok = true, status = 200, body = Readable.from(['video']), length = '5', contentRange } = {}) {
  return { ok, status, body, headers: new Headers({ 'content-length': length, ...(contentRange ? { 'content-range': contentRange } : {}) }) };
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
      return response({ status: 206, length: '10', contentRange: 'bytes 10-19/100' });
    },
  });

  const result = await storage.getStream({ storageKey: 'private/video file.mp4', range: { start: 10, end: 19 } });
  assert.equal(result.size, 10);
  assert.match(captured.url, /^https:\/\/s3\.example\.test\/private-media\/private\/video%20file\.mp4$/);
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.headers.range, 'bytes=10-19');
  assert.equal(captured.options.headers['x-amz-content-sha256'], 'UNSIGNED-PAYLOAD');
  assert.match(captured.options.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIA_TEST\//);
});


test('S3 adapter rejects a range request if the provider returns a full response', async () => {
  let body;
  const storage = createS3MediaStorage({
    bucket: 'private-media', region: 'us-east-1', accessKeyId: 'ACCESS', secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async () => {
      body = Readable.from(['large video body']);
      return response({ status: 200, body, length: '100000000' });
    },
  });

  await assert.rejects(storage.getStream({ storageKey: 'private/a.mp4', range: { start: 0, end: 11 } }), /media_storage_range_failed:200/);
  assert.equal(body.destroyed, true);
});


test('S3 adapter cancels a partial response when its Content-Range does not match the requested bytes', async () => {
  let body;
  const storage = createS3MediaStorage({
    bucket: 'private-media', region: 'us-east-1', accessKeyId: 'ACCESS', secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async () => {
      body = Readable.from(['unexpected partial body']);
      return response({ status: 206, body, length: '10', contentRange: 'bytes 20-29/100' });
    },
  });

  await assert.rejects(
    storage.getStream({ storageKey: 'private/a.mp4', range: { start: 0, end: 9 } }),
    /media_storage_range_failed:206/,
  );
  assert.equal(body.destroyed, true);
});

test('S3 adapter supports metadata, upload, and delete through the same signed boundary', async () => {
  const calls = [];
  const urls = [];
  const storage = createS3MediaStorage({
    bucket: 'private-media',
    region: 'auto',
    accessKeyId: 'ACCESS',
    secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async (url, options) => {
      urls.push(String(url));
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
  assert.deepEqual(urls, [
    'https://objects.example.test/private-media/private/a.mp4',
    'https://objects.example.test/private-media/private/a.mp4',
    'https://objects.example.test/private-media/private/a.mp4',
  ]);
});

test('S3 adapter aborts an upload request when its source stream errors', async () => {
  const stream = new Readable({
    read() {
      this.destroy(new Error('upload_source_failed'));
    },
  });
  let requestSignal;
  const storage = createS3MediaStorage({
    bucket: 'private-media',
    region: 'us-east-1',
    accessKeyId: 'ACCESS',
    secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async (_url, options) => {
      requestSignal = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        stream.resume();
      });
    },
  });

  await assert.rejects(
    storage.putStream({ storageKey: 'private/a.mp4', stream }),
    /upload_source_failed/,
  );
  assert.equal(requestSignal.aborted, true);
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

test('S3 adapter rejects non-success responses and releases their response bodies', async () => {
  const bodies = [];
  const storage = createS3MediaStorage({
    bucket: 'private-media',
    region: 'us-east-1',
    accessKeyId: 'ACCESS',
    secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async () => {
      const body = Readable.from(['provider error body']);
      bodies.push(body);
      return response({ ok: false, status: 500, body });
    },
  });

  await assert.rejects(storage.getStream({ storageKey: 'private/a.mp4' }), /media_storage_get_failed:500/);
  await assert.rejects(storage.getMetadata({ storageKey: 'private/a.mp4' }), /media_storage_metadata_failed:500/);
  await assert.rejects(storage.putStream({ storageKey: 'private/a.mp4', stream: Readable.from(['x']) }), /media_storage_put_failed:500/);
  await assert.rejects(storage.deleteObject({ storageKey: 'private/a.mp4' }), /media_storage_delete_failed:500/);
  assert.equal(bodies.length, 4);
  assert.ok(bodies.every((body) => body.destroyed));
});

test('S3 adapter treats a missing object as a successful idempotent delete', async () => {
  const storage = createS3MediaStorage({
    bucket: 'private-media', region: 'us-east-1', accessKeyId: 'ACCESS', secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async () => response({ ok: false, status: 404 }),
  });

  await storage.deleteObject({ storageKey: 'private/missing.mp4' });
});

test('S3 adapter requires credentials and a fetch implementation', () => {
  assert.throws(() => createS3MediaStorage({ bucket: 'bucket', region: 'auto', secretAccessKey: 'secret' }), /media_s3_configuration_missing/);
  assert.throws(() => createS3MediaStorage({ bucket: 'bucket', region: 'auto', accessKeyId: 'access', secretAccessKey: 'secret', fetchImpl: null }), /media_s3_fetch_missing/);
});


test('S3 adapter keeps the upload error listener until a timed-out source stream closes', async () => {
  let stream;
  const storage = createS3MediaStorage({
    bucket: 'private-media',
    region: 'us-east-1',
    accessKeyId: 'ACCESS',
    secretAccessKey: 'SECRET',
    endpoint: 'https://objects.example.test',
    fetchImpl: async (_url, options) => {
      stream = options.body;
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    },
  });

  const source = new Readable({ read() {} });
  await assert.rejects(
    storage.putStream({ storageKey: 'private/a.mp4', stream: source }),
    /timeout/i,
  );
  assert.equal(source.listenerCount('error'), 1);
  source.destroy(new Error('late_upload_stream_error'));
  await new Promise((resolve) => source.once('close', resolve));
  assert.equal(source.listenerCount('error'), 0);
});
