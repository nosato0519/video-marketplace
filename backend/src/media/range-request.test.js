import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRangeHeader } from './range-request.js';

test('parses a bounded byte range', () => {
  assert.deepEqual(parseRangeHeader('bytes=0-999', 5000), { start: 0, end: 999, length: 1000 });
});

test('parses an open-ended byte range', () => {
  assert.deepEqual(parseRangeHeader('bytes=1000-', 5000), { start: 1000, end: 4999, length: 4000 });
});

test('parses a suffix byte range', () => {
  assert.deepEqual(parseRangeHeader('bytes=-500', 5000), { start: 4500, end: 4999, length: 500 });
});

test('clamps a range end to the media size', () => {
  assert.deepEqual(parseRangeHeader('bytes=4000-9999', 5000), { start: 4000, end: 4999, length: 1000 });
});

test('rejects malformed or out-of-bounds ranges', () => {
  assert.equal(parseRangeHeader('items=0-10', 100), null);
  assert.equal(parseRangeHeader('bytes=100-', 100), null);
  assert.equal(parseRangeHeader('bytes=50-40', 100), null);
});
