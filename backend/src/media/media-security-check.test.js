import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMediaSecurityConfig } from './media-security-check.js';

const validSecret = '0123456789abcdef0123456789abcdef';

test('requires the private media signing secret', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ MEDIA_STORAGE_DIR: '/tmp/media' }),
    /media_url_secret_missing/
  );
});

test('rejects a signing secret shorter than 32 characters', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ MEDIA_URL_SECRET: 'too-short', MEDIA_STORAGE_DIR: '/tmp/media' }),
    /media_url_secret_too_short/
  );
});

test('requires a private media storage directory', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ MEDIA_URL_SECRET: validSecret }),
    /media_storage_dir_missing/
  );
});

test('rejects unsupported providers', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ MEDIA_URL_SECRET: validSecret, MEDIA_STORAGE_DIR: '/tmp/media', MEDIA_STORAGE_PROVIDER: 'public-cdn' }),
    /media_storage_provider_unsupported/
  );
});

test('accepts the local development configuration', () => {
  assert.equal(
    validateMediaSecurityConfig({ MEDIA_URL_SECRET: validSecret, MEDIA_STORAGE_DIR: '/tmp/media', MEDIA_STORAGE_PROVIDER: 'local' }),
    true
  );
});
