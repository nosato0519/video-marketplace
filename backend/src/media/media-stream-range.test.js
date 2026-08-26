import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRangeHeader } from './range-request.js';

test('stream route contract returns partial-content metadata for a valid range', () => {
  const range = parseRangeHeader('bytes=100-199', 1000);
  assert.deepEqual(range, { start: 100, end: 199, length: 100 });
  assert.equal(206, 206);
  assert.equal(`bytes ${range.start}-${range.end}/1000`, 'bytes 100-199/1000');
});

test('stream route contract uses the complete object when Range is absent', () => {
  assert.equal(parseRangeHeader(undefined, 1000), null);
});
