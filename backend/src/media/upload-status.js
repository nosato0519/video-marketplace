// Canonical media states mirror backend/migrations/002_product_media.sql.
export const MEDIA_UPLOAD_STATES = Object.freeze({
  PRIVATE: 'private',
  PROCESSING: 'processing',
  READY: 'ready',
  QUARANTINED: 'quarantined',
  DELETED: 'deleted',
});

export function canPublishMedia(status) {
  return status === MEDIA_UPLOAD_STATES.READY;
}

export function isDownloadableMedia(status, downloadEnabled) {
  return canPublishMedia(status) && downloadEnabled === true;
}
