import { requireAuth } from '../auth/require-auth.js';
import { getProtectedMediaContext } from './protected-media-repository.js';
import { authorizeProtectedMedia } from './protected-access.js';
import { parseRangeHeader } from './range-request.js';

function contentDisposition(productId) {
  const safeId = String(productId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `attachment; filename="video-${safeId}.bin"`;
}

export function registerMediaDownloadRoutes(app, {
  storage,
  getContext = getProtectedMediaContext,
  authMiddleware = requireAuth,
} = {}) {
  if (!storage || typeof storage.getStream !== 'function') {
    throw new Error('media_storage_stream_reader_missing');
  }

  app.get('/api/media/:productId/download', authMiddleware, async (req, res, next) => {
    try {
      const context = await getContext({
        userId: req.user.id,
        productId: req.params.productId,
      });

      const authorization = context
        ? authorizeProtectedMedia({
            user: req.user,
            entitlement: context.entitlement,
            product: context.product,
            asset: context.asset,
          })
        : { allowed: false };

      if (!authorization.allowed) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      if (context.asset.status !== 'ready') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      const size = Number(context.asset.byte_size);
      if (!Number.isSafeInteger(size) || size < 0) {
        return res.status(500).json({ error: { code: 'MEDIA_SIZE_INVALID', message: 'Media size is invalid' } });
      }

      const range = parseRangeHeader(req.headers.range, size);
      const object = await storage.getStream({
        storageKey: context.asset.storage_key,
        range: range ? { start: range.start, end: range.end } : undefined,
      });

      if (!object?.stream) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      res.setHeader('Content-Type', context.asset.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', contentDisposition(req.params.productId));
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Accept-Ranges', 'bytes');

      if (range) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
        res.setHeader('Content-Length', String(range.length));
      } else {
        res.setHeader('Content-Length', String(size));
      }

      return object.stream.pipe(res);
    } catch (error) {
      return next(error);
    }
  });
}
