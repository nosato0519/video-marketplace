import { requireAuth } from '../auth/require-auth.js';
import { getProtectedMediaContext } from './protected-media-repository.js';
import { authorizeProtectedMedia } from './protected-access.js';

export function registerMediaStreamRoutes(app, { storage }) {
  if (!storage || typeof storage.getStream !== 'function') {
    throw new Error('media_storage_stream_reader_missing');
  }

  app.get('/api/media/:productId/stream', requireAuth, async (req, res, next) => {
    try {
      const context = await getProtectedMediaContext({
        userId: req.user.id,
        productId: req.params.productId,
      });

      if (!context || !authorizeProtectedMedia({
        user: req.user,
        entitlement: context.entitlement,
        product: context.product,
        asset: context.asset,
      }).allowed) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      const object = await storage.getStream({ storageKey: context.asset.storage_key });
      if (!object || !object.stream) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      res.setHeader('Content-Type', context.asset.mime_type || 'application/octet-stream');
      if (context.asset.byte_size >= 0) res.setHeader('Content-Length', String(context.asset.byte_size));
      return object.stream.pipe(res);
    } catch (error) {
      return next(error);
    }
  });
}
