import { requireAuth } from '../auth/require-auth.js';
import { verifyVideoDeliverySignature } from '../orders/verify-video-url.js';
import { getProtectedMediaContext } from './protected-media-repository.js';
import { authorizeProtectedMedia } from './protected-access.js';
import { parseRangeHeader } from './range-request.js';

export function registerSignedMediaStreamRoute(app, { storage, secret = process.env.VIDEO_ACCESS_SECRET } = {}) {
  if (!storage || typeof storage.getStream !== 'function') {
    throw new Error('media_storage_stream_reader_missing');
  }

  app.get('/api/media/:productId/secure-stream/:videoId', requireAuth, async (req, res, next) => {
    try {
      verifyVideoDeliverySignature({
        videoId: req.params.videoId,
        expires: req.query.expires,
        signature: req.query.signature,
        secret,
      });

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

      if (String(context.asset.id) !== String(req.params.videoId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      const size = Number(context.asset.byte_size);
      const range = parseRangeHeader(req.headers.range, size);
      const object = await storage.getStream({
        storageKey: context.asset.storage_key,
        range: range ? { start: range.start, end: range.end } : undefined,
      });

      if (!object?.stream) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', context.asset.mime_type || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, no-store');

      if (range) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
        res.setHeader('Content-Length', String(range.length));
      } else if (Number.isInteger(size) && size >= 0) {
        res.setHeader('Content-Length', String(size));
      }

      return object.stream.pipe(res);
    } catch (error) {
      return next(error);
    }
  });
}
