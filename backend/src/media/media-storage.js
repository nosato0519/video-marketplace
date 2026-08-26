export function createMediaStorage({ getObjectStream, getObjectMetadata } = {}) {
  if (typeof getObjectStream !== 'function') throw new Error('media_storage_stream_reader_missing');
  if (typeof getObjectMetadata !== 'function') throw new Error('media_storage_metadata_reader_missing');

  return {
    async getStream({ storageKey, range } = {}) {
      if (!storageKey) throw new Error('media_storage_key_missing');
      if (range !== undefined && (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 0 || range.end < range.start)) {
        throw new Error('media_storage_range_invalid');
      }
      return getObjectStream({ storageKey, range });
    },
    async getMetadata({ storageKey } = {}) {
      if (!storageKey) throw new Error('media_storage_key_missing');
      return getObjectMetadata({ storageKey });
    },
  };
}
