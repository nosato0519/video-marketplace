import { requireAuth } from '../auth/require-auth.js';
import { getProtectedMediaForUser as defaultGetProtectedMediaForUser } from './protected-media-repository.js';
import { createProtectedMediaResponse } from './protected-media-service.js';

export function registerProtectedMediaRoutes(app, {
  secret = process.env.MEDIA_URL_SECRET,
  getProtectedMediaForUser = defaultGetProtectedMediaForUser,
  authMiddleware = requireAuth,
} = {}) {
  if (typeof getProtectedMediaForUser !== 'function') throw new Error('protected_media_context_reader_missing');

  app.get('/api/media/:productId', authMiddleware, async (req, res, next) => {
    try {
      const protectedMedia = await getProtectedMediaForUser({
        userId: req.user.id,
        productId: req.params.productId,
      });

      if (!protectedMedia) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      const result = await createProtectedMediaResponse({
        user: req.user,
        entitlement: protectedMedia.entitlement,
        product: protectedMedia.product,
        asset: protectedMedia.asset,
        secret,
      });

      if (!result.allowed && result.status === 404) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });
}