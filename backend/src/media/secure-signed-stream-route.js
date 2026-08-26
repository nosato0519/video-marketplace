import { requireAuth } from '../auth/require-auth.js';
import { verifyVideoDeliverySignature } from '../orders/verify-video-url.js';
import { getProtectedMediaContext } from './protected-media-repository.js';
import { parseRangeHeader } from './range-request.js';

export function registerSecureSignedStreamRoute(app, { storage } = {}) {
  if (!storage || typeof storage.getStream !== 'function') {
    throw new Error('media_storage_stream_reader_missing');
  }

  app.get('/api/videos/:videoId/stream', requireAuth, async (req, res, next) => {
    try {
      const { videoId } = req.params;
      const verified = verifyVideoDeliverySignature({
        videoId,
        expires: req.query.expires,
        signature: req.query.signature,
      });

      const context = await getProtectedMediaContext({
        userId: req.user.id,
        productId: req.query.productId,
      });

      if (!context || context.asset.video_id !== verified.videoId || !context.entitlement) {
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

      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', context.asset.mime_type || 'application/octet-stream');

      if (range) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
        res.setHeader('Content-Length', String(range.length));
      } else if (Number.isInteger(size) && size >= 0) {
        res.setHeader('Content-Length', String(size));
      }

      return object.stream.pipe(res);
    } catch (error) {
      if (error?.message?.startsWith('video_delivery_')) {
        return res.status(403).json({ error: { code: 'VIDEO_ACCESS_DENIED', message: 'Video access denied' } });
      }
      return next(error);
    }
  });
}
