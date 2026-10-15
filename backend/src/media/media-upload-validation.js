const FTYP = { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] };
const EBML = { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] };

const MIME_SIGNATURES = new Map([
  ['video/mp4', FTYP],
  ['video/quicktime', FTYP],
  ['video/webm', EBML],
  ['video/x-matroska', EBML],
  ['image/jpeg', { offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  ['image/png', { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  ['image/webp', { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }],
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
