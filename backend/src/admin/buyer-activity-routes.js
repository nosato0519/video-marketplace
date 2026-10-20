import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/buyer-activity', async (_req, res, next) => {
  try {
    const [favorites, cart] = await Promise.all([
      query(
        `SELECT p.id AS "productId", p.title, u.email, f.created_at AS "createdAt"
           FROM user_favorites f
           JOIN users u ON u.id = f.user_id
           JOIN products p ON p.id = f.product_id
          WHERE p.status = 'published'
          ORDER BY f.created_at DESC
          LIMIT 500`
      ),
      query(
        `SELECT p.id AS "productId", p.title, u.email, c.created_at AS "createdAt"
           FROM user_cart_items c
           JOIN users u ON u.id = c.user_id
           JOIN products p ON p.id = c.product_id
          WHERE p.status = 'published'
          ORDER BY c.created_at DESC
          LIMIT 500`
      ),
    ]);
    return res.json({
      favorites: favorites.rows,
      cart: cart.rows,
    });
  } catch (error) { return next(error); }
});

export default router;
