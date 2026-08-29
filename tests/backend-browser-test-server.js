import http from 'node:http';

const port = Number(process.env.TEST_SERVER_PORT || 4173);
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/api/auth/me') {
    res.writeHead(200);
    res.end(JSON.stringify({ user: { id: 'buyer-e2e', email: 'buyer-e2e@example.test', role: 'buyer' } }));
    return;
  }
  if (req.url === '/api/seller/application' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ application: null }));
    return;
  }
  if (req.url === '/api/seller/application' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      res.writeHead(201);
      res.end(JSON.stringify({ application: { id: 'backend-e2e-1', status: 'pending', display_name: payload.displayName, legal_name: payload.legalName, country_code: payload.countryCode, message: payload.message } }));
    });
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`backend browser test server listening on ${port}`);
});
