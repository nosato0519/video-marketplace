import crypto from 'node:crypto';

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

  async function request(method, storageKey, { range, body } = {}) {
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

    const response = await fetchImpl(url, {
      method,
      headers,
      body,
      ...(body ? { duplex: 'half' } : {}),
    });
    return response;
  }

  return {
    async getStream({ storageKey, range } = {}) {
      const response = await request('GET', storageKey, { range });
      if (!response.ok) throw new Error(`media_storage_get_failed:${response.status}`);
      return { stream: response.body, size: Number(response.headers.get('content-length') || 0) };
    },
    async getMetadata({ storageKey } = {}) {
      const response = await request('HEAD', storageKey);
      if (!response.ok) throw new Error(`media_storage_metadata_failed:${response.status}`);
      return { size: Number(response.headers.get('content-length') || 0) };
    },
    async putStream({ storageKey, stream } = {}) {
      const response = await request('PUT', storageKey, { body: stream });
      if (!response.ok) throw new Error(`media_storage_put_failed:${response.status}`);
      return { size: Number(response.headers.get('content-length') || 0) || null };
    },
    async deleteObject({ storageKey } = {}) {
      const response = await request('DELETE', storageKey);
      if (!response.ok && response.status !== 404) throw new Error(`media_storage_delete_failed:${response.status}`);
    },
  };
}
