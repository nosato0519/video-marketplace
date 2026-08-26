export const MEDIA_UPLOAD_STATES = Object.freeze({
  PENDING: 'pending',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
});

export function canPublishMedia(status) {
  return status === MEDIA_UPLOAD_STATES.READY;
}

export function isDownloadableMedia(status, downloadEnabled) {
  return status === MEDIA_UPLOAD_STATES.READY && downloadEnabled === true;
}
