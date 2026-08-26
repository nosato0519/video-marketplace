export function createMediaStorage({ getObjectStream, getObjectMetadata } = {}) {
  if (typeof getObjectStream !== 'function') throw new Error('media_storage_stream_reader_missing');
  if (typeof getObjectMetadata !== 'function') throw new Error('media_storage_metadata_reader_missing');

  return {
    async getStream({ storageKey }) {
      if (!storageKey) throw new Error('media_storage_key_missing');
      return getObjectStream({ storageKey });
    },
    async getMetadata({ storageKey }) {
      if (!storageKey) throw new Error('media_storage_key_missing');
      return getObjectMetadata({ storageKey });
    },
  };
}
