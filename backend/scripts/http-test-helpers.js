import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

export async function startServer() {
  const server = createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise((resolve) => server.close(() => resolve()));
    throw new Error('failed to determine test server address');
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

export async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  const setCookie = response.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';', 1)[0] : null;

  return { response, body, cookie };
}
