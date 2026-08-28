const MIME_SIGNATURES = new Map([
  ['video/mp4', { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  ['video/webm', { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  ['video/x-matroska', { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
]);

export function mediaSignatureMatches(mimeType, buffer) {
  const signature = MIME_SIGNATURES.get(String(mimeType || '').toLowerCase());
  if (!signature || !Buffer.isBuffer(buffer)) return false;
  if (buffer.length < signature.offset + signature.bytes.length) return false;
  return signature.bytes.every((byte, index) => buffer[signature.offset + index] === byte);
}

export function requiredSignatureBytes(mimeType) {
  const signature = MIME_SIGNATURES.get(String(mimeType || '').toLowerCase());
  if (!signature) return 0;
  return signature.offset + signature.bytes.length;
}
