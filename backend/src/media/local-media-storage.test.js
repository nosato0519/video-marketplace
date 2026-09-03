import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalMediaStorage } from './local-media-storage.js';

test('local media storage supports full, ranged, and write reads', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-storage-'));
  try {
    await fs.mkdir(path.join(root, 'private'));
    await fs.writeFile(path.join(root, 'private', 'video.bin'), '0123456789');
    const storage = createLocalMediaStorage({ rootDir: root });

    const full = await storage.getStream({ storageKey: 'private/video.bin' });
    assert.equal(full.size, 10);
    assert.equal(full.stream.readable, true);
    full.stream.destroy();

    const ranged = await storage.getStream({ storageKey: 'private/video.bin', range: { start: 2, end: 5 } });
    assert.equal(ranged.size, 10);
    const chunks = [];
    for await (const chunk of ranged.stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), '2345');

    const written = await storage.putStream({ storageKey: 'private/new.bin', stream: Readable.from(['abcdefgh']) });
    assert.equal(written.size, 8);
    assert.equal(await fs.readFile(path.join(root, 'private', 'new.bin'), 'utf8'), 'abcdefgh');
    await storage.deleteObject({ storageKey: 'private/new.bin' });
    await assert.rejects(fs.access(path.join(root, 'private', 'new.bin')));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('local media storage blocks path traversal for reads and writes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-storage-'));
  try {
    const storage = createLocalMediaStorage({ rootDir: root });
    await assert.rejects(storage.getMetadata({ storageKey: '../secret.txt' }), /media_storage_key_invalid/);
    await assert.rejects(storage.putStream({ storageKey: '../secret.txt', stream: Readable.from(['x']) }), /media_storage_key_invalid/);
    await assert.rejects(storage.deleteObject({ storageKey: '../secret.txt' }), /media_storage_key_invalid/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
