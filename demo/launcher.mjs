import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(join(root, 'server.js'), 'utf8');
const marker = "  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const s = session(req, res);";
const injected = `${marker}
  if (req.method === 'GET' && url.pathname === '/app.js') {
    const [app, boot] = await Promise.all([readFile(join(ROOT, 'app.js'), 'utf8'), readFile(join(ROOT, 'boot.js'), 'utf8')]);
    res.writeHead(200, {'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}); res.end(app + '\\n' + boot); return;
  }
  if (req.method === 'GET' && url.pathname === '/boot.js') {
    const boot = await readFile(join(ROOT, 'boot.js'), 'utf8');
    res.writeHead(200, {'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}); res.end(boot); return;
  }
`;
if (!source.includes(marker)) throw new Error('server injection marker not found');
const patched = source.replace(marker, injected);
const temp = join(root, `.server-${randomUUID()}.mjs`);
await writeFile(temp, patched, 'utf8');
await import(`file://${temp}`);
