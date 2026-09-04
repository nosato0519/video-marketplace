import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(join(root, 'server.js'), 'utf8');
const marker = "  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const s = session(req, res);";
const injected = `${marker}
  if (req.method === 'GET' && url.pathname === '/app.js') {
    const app = await readFile(join(ROOT, 'app.js'), 'utf8');
    const boot = await readFile(join(ROOT, 'boot.js'), 'utf8');
    res.writeHead(200, {'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});
    res.end(app + '\\n' + boot); return;
  }
  if (req.method === 'GET' && url.pathname === '/boot.js') {
    const boot = await readFile(join(ROOT, 'boot.js'), 'utf8');
    res.writeHead(200, {'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});
    res.end(boot); return;
  }
  if (req.method === 'GET' && url.pathname === '/visual-overhaul.css') {
    const css = await readFile(join(ROOT, 'visual-overhaul.css'), 'utf8');
    res.writeHead(200, {'content-type':'text/css; charset=utf-8','cache-control':'no-store'});
    res.end(css); return;
  }
  if (req.method === 'GET' && url.pathname === '/') {
    const html = await readFile(join(ROOT, 'index.html'), 'utf8');
    const safeHtml = html
      .replace('<body>', '<body><span id="role" hidden></span><span id="rolePill" hidden></span>')
      .replace('</head>', '<link rel="stylesheet" href="/visual-overhaul.css"><\/head>')
      .replace('<option>All categories</option>', '<option value="All categories">All categories</option>');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(safeHtml); return;
  }
`;
if (!source.includes(marker)) throw new Error('server injection marker not found');
const patched = source.replace(marker, injected);
const temp = join(root, `.server-${randomUUID()}.mjs`);
await writeFile(temp, patched, 'utf8');
try { await import(`file://${temp}`); } finally { try { await unlink(temp); } catch {} }
