import fs from 'node:fs';
import path from 'node:path';

function resolveStoragePath(storageKey, rootDir) {
  if (!storageKey || storageKey.includes('\0')) throw new Error('media_storage_key_invalid');
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('media_storage_key_invalid');
  }
  return resolved;
}

export function createLocalMediaStorage({ rootDir = process.env.MEDIA_STORAGE_DIR } = {}) {
  if (!rootDir) throw new Error('media_storage_dir_missing');

  return {
    async getStream({ storageKey, range } = {}) {
      const filePath = resolveStoragePath(storageKey, rootDir);
      const stat = await fs.promises.stat(filePath);
      const options = range ? { start: range.start, end: range.end } : {};
      return { stream: fs.createReadStream(filePath, options), size: stat.size };
    },
    async getMetadata({ storageKey } = {}) {
      const filePath = resolveStoragePath(storageKey, rootDir);
      const stat = await fs.promises.stat(filePath);
      return { size: stat.size };
    },
    async putStream({ storageKey, stream } = {}) {
      const filePath = resolveStoragePath(storageKey, rootDir);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(filePath, { flags: 'wx' });
        output.on('finish', resolve);
        output.on('error', reject);
        stream.on('error', reject);
        stream.pipe(output);
      });
      const stat = await fs.promises.stat(filePath);
      return { size: stat.size };
    },
    async deleteObject({ storageKey } = {}) {
      const filePath = resolveStoragePath(storageKey, rootDir);
      await fs.promises.rm(filePath, { force: true });
    },
  };
}
