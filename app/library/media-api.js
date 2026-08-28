export function mediaStreamUrl(productId) {
  return `/api/media/${encodeURIComponent(productId)}/stream`;
}

export function mediaDownloadUrl(productId) {
  return `/api/media/${encodeURIComponent(productId)}/download`;
}
