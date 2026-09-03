import { requireAuth } from '../auth/require-auth.js';
import { getProtectedMediaContext } from './protected-media-repository.js';
import { authorizeProtectedMedia } from './protected-access.js';
import { parseRangeHeader } from './range-request.js';

const MIME_EXTENSIONS = new Map([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/quicktime', 'mov'],
  ['video/x-matroska', 'mkv'],
]);

function contentDisposition(productId, mimeType) {
  const safeId = String(productId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const extension = MIME_EXTENSIONS.get(String(mimeType).toLowerCase()) || 'bin';
  return `attachment; filename="video-${safeId}.${extension}"`;
}

function getRequestedRange(header, size) {
  if (header == null || String(header).trim() === '') return { range: null };
  const range = parseRangeHeader(header, size);
  if (!range) return { error: true };
  return { range };
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

      const requested = getRequestedRange(req.headers.range, size);
      if (requested.error) {
        res.setHeader('Content-Range', `bytes */${size}`);
        return res.status(416).json({ error: { code: 'RANGE_NOT_SATISFIABLE', message: 'Requested range is not satisfiable' } });
      }
      const range = requested.range;
      const object = await storage.getStream({
        storageKey: context.asset.storage_key,
        range: range ? { start: range.start, end: range.end } : undefined,
      });

      if (!object?.stream) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      res.setHeader('Content-Type', context.asset.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', contentDisposition(req.params.productId, context.asset.mime_type));
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
