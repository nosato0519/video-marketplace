import crypto from 'node:crypto';
import { Readable } from 'node:stream';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function encodeKey(key) {
  return String(key).split('/').map((part) => encodeURIComponent(part)).join('/');
}

function encodeQuery(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodePath(pathname) {
  return pathname.split('/').map((part) => {
    const slashToken = '__S3_ENCODED_SLASH__';
    const protectedPart = part.replace(/%2F/gi, slashToken);
    return encodeURIComponent(decodeURIComponent(protectedPart)).replaceAll(slashToken, '%2F');
  }).join('/');
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function signingKey(secret, date, region, service = 's3') {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, 'aws4_request');
}

function endpointFor({ endpoint, bucket, region }) {
  if (endpoint) return endpoint.replace(/\/$/, '');
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

function objectUrl({ endpoint, bucket, region, storageKey }) {
  const base = endpointFor({ endpoint, bucket, region });
  const path = endpoint ? `${encodeURIComponent(bucket)}/${encodeKey(storageKey)}` : encodeKey(storageKey);
  return new URL(`${base}/${path}`);
}

async function cancelResponseBody(response) {
  if (typeof response.body?.cancel === 'function') {
    await response.body.cancel().catch(() => {});
  } else {
    response.body?.destroy?.();
  }
}

function validateKey(storageKey) {
  if (!storageKey || storageKey.includes('\0') || storageKey.startsWith('/') || storageKey.split('/').includes('..')) {
    throw new Error('media_storage_key_invalid');
  }
}

export function createS3MediaStorage({
  bucket = process.env.MEDIA_S3_BUCKET,
  region = process.env.MEDIA_S3_REGION || 'auto',
  accessKeyId = process.env.MEDIA_S3_ACCESS_KEY_ID,
  secretAccessKey = process.env.MEDIA_S3_SECRET_ACCESS_KEY,
  endpoint = process.env.MEDIA_S3_ENDPOINT,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!bucket || !accessKeyId || !secretAccessKey) throw new Error('media_s3_configuration_missing');
  if (typeof fetchImpl !== 'function') throw new Error('media_s3_fetch_missing');

  async function request(method, storageKey, { range, body, contentLength } = {}) {
    validateKey(storageKey);
    const url = objectUrl({ endpoint, bucket, region, storageKey });
    const now = new Date();
    const timestamp = amzDate(now);
    const date = timestamp.slice(0, 8);
    const payloadHash = 'UNSIGNED-PAYLOAD';
    const headers = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': timestamp,
    };
    if (range) headers.range = `bytes=${range.start}-${range.end}`;
    if (body && Number.isSafeInteger(contentLength) && contentLength >= 0) headers['content-length'] = String(contentLength);

    const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key].trim()}\n`).join('');
    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalRequest = [
      method,
      encodePath(url.pathname),
      [...url.searchParams.entries()].sort().map(([key, value]) => `${encodeQuery(key)}=${encodeQuery(value)}`).join('&'),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const scope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
    const signature = crypto.createHmac('sha256', signingKey(secretAccessKey, date, region)).update(stringToSign).digest('hex');
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const timeoutSignal = AbortSignal.timeout(180000);
    let signal = timeoutSignal;
    let onBodyError;
    let onTimeout;
    if (body && typeof body.once === 'function') {
      const bodyErrorController = new AbortController();
      onBodyError = (error) => bodyErrorController.abort(error);
      onTimeout = () => {
        if (!body.destroyed) body.destroy();
      };
      body.once('error', onBodyError);
      timeoutSignal.addEventListener('abort', onTimeout, { once: true });
      signal = AbortSignal.any([timeoutSignal, bodyErrorController.signal]);
    }

    try {
      return await fetchImpl(url, {
        method,
        headers,
        body,
        signal,
        ...(body ? { duplex: 'half' } : {}),
      });
    } finally {
      if (body && onBodyError) {
        const cleanupBodyErrorListener = () => body.removeListener('error', onBodyError);
        if (body.closed || body.destroyed && body.readableEnded) cleanupBodyErrorListener();
        else body.once('close', cleanupBodyErrorListener);
      }
      if (onTimeout) timeoutSignal.removeEventListener('abort', onTimeout);
    }
  }

  return {
    async getStream({ storageKey, range } = {}) {
      const response = await request('GET', storageKey, { range });
      if (range) {
        const expectedRange = `bytes ${range.start}-${range.end}/`;
        const contentRange = response.headers.get('content-range') || '';
        if (response.status !== 206 || !contentRange.startsWith(expectedRange)) {
          await cancelResponseBody(response);
          throw new Error(`media_storage_range_failed:${response.status}`);
        }
      }
      if (!response.ok) {
        await cancelResponseBody(response);
        throw new Error(`media_storage_get_failed:${response.status}`);
      }
      const stream = response.body instanceof Readable ? response.body : Readable.fromWeb(response.body);
      return { stream, size: Number(response.headers.get('content-length') || 0) };
    },
    async getMetadata({ storageKey } = {}) {
      const response = await request('HEAD', storageKey);
      if (!response.ok) {
        await cancelResponseBody(response);
        throw new Error(`media_storage_metadata_failed:${response.status}`);
      }
      return { size: Number(response.headers.get('content-length') || 0) };
    },
    async putStream({ storageKey, stream, contentLength } = {}) {
      const response = await request('PUT', storageKey, { body: stream, contentLength });
      if (!response.ok) {
        await cancelResponseBody(response);
        throw new Error(`media_storage_put_failed:${response.status}`);
      }
      return { size: Number(response.headers.get('content-length') || 0) || null };
    },
    async deleteObject({ storageKey } = {}) {
      const response = await request('DELETE', storageKey);
      if (!response.ok && response.status !== 404) {
        await cancelResponseBody(response);
        throw new Error(`media_storage_delete_failed:${response.status}`);
      }
    },
  };
}
