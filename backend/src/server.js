import express from 'express';
import helmet from 'helmet';
import { listCatalog } from './catalog.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'video-marketplace-api', version: '0.1.0' });
});

app.get('/api/catalog/products', async (req, res, next) => {
  try {
    const result = await listCatalog({
      locale: typeof req.query.locale === 'string' ? req.query.locale : 'en',
      category: typeof req.query.category === 'string' ? req.query.category : '',
      search: typeof req.query.search === 'string' ? req.query.search : '',
      page: req.query.page,
      limit: req.query.limit
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

app.listen(port, () => {
  console.log(`Video marketplace API listening on port ${port}`);
});
