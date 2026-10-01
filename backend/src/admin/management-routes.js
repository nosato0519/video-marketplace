import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

async function audit(db, actor, action, type, id, metadata = {}) {
  await db.query(
    'INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, metadata) VALUES ($1,$2,$3,$4,$5::jsonb)',
    [actor, action, type, id || null, JSON.stringify(metadata)]
  );
}

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [users, products, orders, sales, payouts, applications, verifications, moderation, reports, recentOrders, recentProducts, recentSellers, recentBuyers] = await Promise.all([
      query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE role='buyer')::int buyers, COUNT(*) FILTER (WHERE role='seller')::int sellers FROM users"),
      query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='published')::int published, COUNT(*) FILTER (WHERE status IN ('submitted','under_review'))::int review FROM products"),
      query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='paid')::int paid FROM orders"),
      query("SELECT currency, COALESCE(SUM(amount),0)::numeric(14,2) total FROM orders WHERE status='paid' GROUP BY currency ORDER BY currency"),
      query("SELECT COUNT(*) FILTER (WHERE status IN ('requested','reviewing','approved','processing'))::int pending, COUNT(*) FILTER (WHERE status='paid')::int paid, COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::numeric(14,2) paid_amount FROM payouts"),
      query("SELECT COUNT(*)::int pending FROM seller_applications WHERE status IN ('pending','under_review')"),
      query("SELECT COUNT(*)::int submitted FROM seller_profiles WHERE verification_status IN ('submitted','under_review')"),
      query("SELECT COUNT(*)::int pending FROM content_reviews WHERE status IN ('pending','changes_requested')"),
      query("SELECT COUNT(*)::int open FROM content_reports WHERE status IN ('open','reviewing')"),
      query("SELECT o.id,o.amount,o.currency,o.status,o.created_at,u.email buyer_email,p.title product_title FROM orders o JOIN users u ON u.id=o.buyer_id JOIN products p ON p.id=o.product_id ORDER BY o.created_at DESC LIMIT 8"),
      query("SELECT p.id,p.title,p.status,p.price_amount,p.price_currency,u.email seller_email FROM products p JOIN users u ON u.id=p.seller_id ORDER BY p.created_at DESC LIMIT 8"),
      query("SELECT u.id,u.email,u.status,u.created_at,sp.display_name,sp.verification_status FROM users u LEFT JOIN seller_profiles sp ON sp.user_id=u.id WHERE u.role='seller' ORDER BY u.created_at DESC LIMIT 8"),
      query("SELECT id,email,status,created_at FROM users WHERE role='buyer' ORDER BY created_at DESC LIMIT 8")
    ]);
    res.json({
      users: users.rows[0], products: products.rows[0], orders: orders.rows[0], sales: sales.rows,
      payouts: payouts.rows[0],
      queue: { seller_applications: applications.rows[0].pending, seller_verifications: verifications.rows[0].submitted, content_reviews: moderation.rows[0].pending, reports: reports.rows[0].open },
      recent: { orders: recentOrders.rows, products: recentProducts.rows, sellers: recentSellers.rows, buyers: recentBuyers.rows }
    });
  } catch (error) { next(error); }
});

router.post('/products/:id/status', async (req, res, next) => {
  try {
    const action = String(req.body?.action || '').trim();
    const current = await query('SELECT id,title,status FROM products WHERE id=$1', [req.params.id]);
    if (!current.rowCount) return res.status(404).json({ error: 'product_not_found' });
    const from = current.rows[0].status;
    const target = { publish:'published', suspend:'suspended', restore:'approved' }[action];
    const allowed = { publish:['approved'], suspend:['published','approved'], restore:['suspended'] };
    if (!target || !allowed[action]?.includes(from)) return res.status(409).json({ error:'invalid_product_status_transition',from,action });
    const product = await withTransaction(async db => {
      const updated = await db.query("UPDATE products SET status=$2,published_at=CASE WHEN $2='published' THEN COALESCE(published_at,NOW()) ELSE NULL END,updated_at=NOW() WHERE id=$1 RETURNING id,title,status,price_amount,price_currency,updated_at,published_at", [req.params.id,target]);
      await audit(db,req.user.id,'admin.product.'+action,'product',req.params.id,{from_status:from,to_status:target});
      return updated.rows[0];
    });
    res.json({ product });
  } catch (error) { next(error); }
});

router.post('/users/:id/status', async (req,res,next) => {
  try {
    const status=String(req.body?.status||'').trim();
    if (!['active','suspended'].includes(status)) return res.status(400).json({error:'invalid_user_status'});
    if (req.params.id===req.user.id) return res.status(409).json({error:'cannot_change_own_status'});
    const current=await query('SELECT id,email,role,status FROM users WHERE id=$1',[req.params.id]);
    if (!current.rowCount) return res.status(404).json({error:'user_not_found'});
    if (current.rows[0].role==='admin') return res.status(403).json({error:'admin_status_protected'});
    const user=await withTransaction(async db=>{
      const updated=await db.query('UPDATE users SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id,email,role,status',[req.params.id,status]);
      await audit(db,req.user.id,'admin.user.status.'+status,'user',req.params.id,{from_status:current.rows[0].status,to_status:status});
      return updated.rows[0];
    });
    res.json({user});
  } catch(error){next(error);}
});

export default router;