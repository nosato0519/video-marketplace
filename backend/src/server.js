import express from 'express';
import helmet from 'helmet';

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'video-marketplace-api', version: '0.1.0' });
});

app.get('/api/catalog/products', (_req, res) => {
  // Temporary adapter endpoint. Replace with the database-backed catalog service.
  res.json({ data: [], meta: { source: 'database-pending' } });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

app.listen(port, () => {
  console.log(`Video marketplace API listening on port ${port}`);
});
