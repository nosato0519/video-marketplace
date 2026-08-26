export function parseRangeHeader(rangeHeader, size) {
  if (!rangeHeader || !Number.isInteger(size) || size < 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const startRaw = match[1];
  const endRaw = match[2];
  let start;
  let end;

  if (startRaw === '' && endRaw === '') return null;
  if (startRaw === '') {
    const suffixLength = Number(endRaw);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(startRaw);
    if (!Number.isInteger(start) || start < 0 || start >= size) return null;
    end = endRaw === '' ? size - 1 : Number(endRaw);
    if (!Number.isInteger(end) || end < start) return null;
    end = Math.min(end, size - 1);
  }

  return { start, end, length: end - start + 1 };
}
