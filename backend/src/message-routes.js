import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';

const router = express.Router();
router.use(requireAuth);

const text = (value, max) => String(value ?? '').trim().slice(0, max);
const isAdmin = (req) => req.user.role === 'admin';

async function getThread(id, user) {
  const result = await query(
    `SELECT t.id, t.created_by, t.assigned_to, t.subject, t.status, t.created_at, t.updated_at,
            creator.display_name AS creator_name, creator.role AS creator_role,
            assignee.display_name AS assignee_name, assignee.role AS assignee_role,
            (SELECT COUNT(*)::int FROM messages m
              WHERE m.thread_id = t.id AND m.sender_id <> $2 AND m.read_at IS NULL) AS unread_count
       FROM message_threads t
       JOIN users creator ON creator.id = t.created_by
       LEFT JOIN users assignee ON assignee.id = t.assigned_to
      WHERE t.id = $1
        AND ($3::boolean OR t.created_by = $2 OR t.assigned_to = $2)`,
    [id, user.id, isAdmin({ user })]
  );
  return result.rows[0] || null;
}

router.get('/context', async (req, res) => {
  return res.json({ user: { id: req.user.id, role: req.user.role, displayName: req.user.display_name || '' } });
});

router.get('/contacts', async (req, res, next) => {
  try {
    let roles;
    if (req.user.role === 'buyer') roles = ['seller'];
    else if (req.user.role === 'seller') roles = ['buyer'];
    else roles = ['buyer', 'seller'];
    const result = await query(
      `SELECT id, display_name, role FROM users
        WHERE role = ANY($1::text[]) AND status = 'active'
        ORDER BY display_name ASC LIMIT 200`,
      [roles]
    );
    return res.json({ contacts: result.rows });
  } catch (error) { return next(error); }
});

router.get('/threads', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.id, t.created_by, t.assigned_to, t.subject, t.status, t.created_at, t.updated_at,
              creator.display_name AS creator_name, creator.role AS creator_role,
              assignee.display_name AS assignee_name, assignee.role AS assignee_role,
              last_message.body AS last_message,
              last_message.created_at AS last_message_at,
              (SELECT COUNT(*)::int FROM messages m
                WHERE m.thread_id = t.id AND m.sender_id <> $1 AND m.read_at IS NULL) AS unread_count
         FROM message_threads t
         JOIN users creator ON creator.id = t.created_by
         LEFT JOIN users assignee ON assignee.id = t.assigned_to
         LEFT JOIN LATERAL (
           SELECT body, created_at FROM messages
            WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
         ) last_message ON TRUE
        WHERE ($2::boolean OR t.created_by = $1 OR t.assigned_to = $1)
        ORDER BY t.updated_at DESC
        LIMIT 200`,
      [req.user.id, isAdmin(req)]
    );
    return res.json({ threads: result.rows });
  } catch (error) { return next(error); }
});

router.post('/threads', async (req, res, next) => {
  try {
    const subject = text(req.body?.subject, 200);
    const body = text(req.body?.message, 5000);
    const recipientId = text(req.body?.recipientId, 100);
    if (!subject || !body) return res.status(400).json({ error: 'subject_and_message_required' });

    let assignedTo = null;
    if ((req.user.role === 'buyer' || req.user.role === 'seller') && !recipientId) {
      const admin = await query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY created_at ASC LIMIT 1`);
      assignedTo = admin.rows[0]?.id || null;
      if (!assignedTo) return res.status(503).json({ error: 'operator_account_unavailable' });
    } else {
      if (!recipientId) return res.status(400).json({ error: 'recipient_required' });
      const recipient = await query(`SELECT id, role, status FROM users WHERE id = $1 LIMIT 1`, [recipientId]);
      if (!recipient.rowCount || recipient.rows[0].status !== 'active') return res.status(404).json({ error: 'recipient_not_found' });
      const role = recipient.rows[0].role;
      const allowed = isAdmin(req)
        ? ['buyer', 'seller'].includes(role)
        : req.user.role === 'buyer' ? role === 'seller'
        : req.user.role === 'seller' ? role === 'buyer'
        : false;
      if (!allowed) return res.status(403).json({ error: 'recipient_not_allowed' });
      assignedTo = recipient.rows[0].id;
    }

    const thread = await withTransaction(async (client) => {
      const created = await client.query(
        `INSERT INTO message_threads (created_by, assigned_to, subject)
         VALUES ($1, $2, $3)
         RETURNING id, created_by, assigned_to, subject, status, created_at, updated_at`,
        [req.user.id, assignedTo, subject]
      );
      const item = created.rows[0];
      await client.query(
        `INSERT INTO messages (thread_id, sender_id, body) VALUES ($1, $2, $3)`,
        [item.id, req.user.id, body]
      );
      return item;
    });
    return res.status(201).json({ thread });
  } catch (error) { return next(error); }
});

router.get('/threads/:id', async (req, res, next) => {
  try {
    const thread = await getThread(req.params.id, req.user);
    if (!thread) return res.status(404).json({ error: 'thread_not_found' });
    const result = await query(
      `SELECT m.id, m.sender_id, u.display_name AS sender_name, u.role AS sender_role,
              m.body, m.created_at, m.read_at
         FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.thread_id = $1 ORDER BY m.created_at ASC`,
      [thread.id]
    );
    await query(
      `UPDATE messages SET read_at = NOW()
        WHERE thread_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
      [thread.id, req.user.id]
    );
    return res.json({ thread, messages: result.rows });
  } catch (error) { return next(error); }
});

router.post('/threads/:id/messages', async (req, res, next) => {
  try {
    const body = text(req.body?.message, 5000);
    if (!body) return res.status(400).json({ error: 'message_required' });
    const thread = await getThread(req.params.id, req.user);
    if (!thread) return res.status(404).json({ error: 'thread_not_found' });
    if (thread.status === 'resolved' && !isAdmin(req)) {
      return res.status(409).json({ error: 'thread_resolved' });
    }
    const result = await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO messages (thread_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, thread_id, sender_id, body, created_at, read_at`,
        [thread.id, req.user.id, body]
      );
      await client.query(
        `UPDATE message_threads SET updated_at = NOW(),
           status = CASE WHEN $2 = 'admin' THEN 'waiting' ELSE 'open' END
         WHERE id = $1`,
        [thread.id, req.user.role]
      );
      return inserted.rows[0];
    });
    return res.status(201).json({ message: result });
  } catch (error) { return next(error); }
});

router.patch('/threads/:id/status', async (req, res, next) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'admin_required' });
    const status = text(req.body?.status, 20);
    if (!['open', 'waiting', 'resolved'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
    const result = await query(
      `UPDATE message_threads SET status = $2, updated_at = NOW()
        WHERE id = $1 RETURNING id, status, updated_at`,
      [req.params.id, status]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'thread_not_found' });
    return res.json({ thread: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
