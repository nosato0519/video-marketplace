import express from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import { createConfiguredMediaStorage } from '../media/media-storage-factory.js';

const router = express.Router();
const verificationStorage = createConfiguredMediaStorage();
router.use(requireAuth, requireRole('admin'));

const transitions = {
  not_started: new Set(['verified']),
  submitted: new Set(['under_review', 'verified', 'rejected', 'request_changes']),
  under_review: new Set(['verified', 'rejected', 'request_changes']),
  request_changes: new Set(['submitted']),
  rejected: new Set(['submitted']),
  verified: new Set()
};

async function audit(db, actor, action, resourceId, metadata) {
  await db.query(`INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, metadata) VALUES ($1,$2,'seller',$3,$4::jsonb)`, [actor, action, resourceId, JSON.stringify(metadata)]);
}

router.get('/seller-verifications', async (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  try {
    const status = String(req.query.status || 'submitted').trim();
    const allowed = new Set(['submitted','under_review','verified','rejected','request_changes','not_started']);
    if (!allowed.has(status)) return res.status(400).json({ error: 'invalid_status' });
    const result = await query(`SELECT sp.user_id, sp.display_name, sp.legal_name, sp.country_code, sp.bio, sp.address, sp.postal_code, sp.phone, sp.verification_status, sp.verification_note, sp.submitted_at, sp.verified_at, u.email,
              CASE WHEN ps.setting_value->>'value' = 'document' THEN 'document' ELSE 'none' END AS verification_method,
              svd.id AS verification_document_id, svd.original_filename AS verification_document_filename, svd.mime_type AS verification_document_mime_type, svd.status AS verification_document_status
         FROM seller_profiles sp
         JOIN users u ON u.id=sp.user_id
         LEFT JOIN platform_settings ps ON ps.setting_key='seller_verification_method'
         LEFT JOIN seller_verification_documents svd ON svd.user_id=sp.user_id
        WHERE sp.verification_status=$1
        ORDER BY sp.submitted_at DESC NULLS LAST LIMIT 200`, [status]);
    return res.json({ sellers: result.rows });
  } catch (e) { return next(e); }
});

router.get('/seller-verifications/:userId/document', async (req, res, next) => {
  try {
    const result = await query(`SELECT storage_key, original_filename, mime_type, byte_size FROM seller_verification_documents WHERE user_id = $1`, [req.params.userId]);
    const document = result.rows[0];
    if (!document) return res.status(404).json({ error: 'verification_document_not_found' });
    const object = await verificationStorage.getStream({ storageKey: document.storage_key });
    if (!object?.stream) return res.status(404).json({ error: 'verification_document_not_found' });
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Type', document.mime_type);
    const originalFilename = String(document.original_filename || 'identity-document').replace(/["\\\r\n]/g, '_');
    const asciiFilename = originalFilename.replace(/[^\x20-\x7E]/g, '_').slice(0, 255) || 'identity-document';
    const encodedFilename = encodeURIComponent(originalFilename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    res.set('Content-Disposition', `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.set('Content-Length', String(document.byte_size));
    const stream = typeof object.stream.pipe === 'function'
      ? object.stream
      : Readable.fromWeb(object.stream);
    try {
      await pipeline(stream, res);
    } catch (streamError) {
      if (res.headersSent) {
        res.destroy(streamError);
        return;
      }
      throw streamError;
    }
    return;
  } catch (error) { return next(error); }
});

router.post('/seller-verifications/:userId/review', async (req, res, next) => {
  try {
    const action = String(req.body?.action || '').trim();
    const target = { request_changes: 'request_changes', reject: 'rejected', approve: 'verified', start_review: 'under_review' }[action];
    if (!target) return res.status(400).json({ error: 'invalid_review_action' });
    const note = req.body?.note == null ? null : String(req.body.note).trim().slice(0, 1000);
    if ((action === 'reject' || action === 'request_changes') && !note) {
      return res.status(400).json({ error: 'review_note_required' });
    }

    const result = await withTransaction(async (db) => {
      const current = await db.query(
        `SELECT user_id, verification_status FROM seller_profiles WHERE user_id=$1 FOR UPDATE`,
        [req.params.userId]
      );
      if (!current.rowCount) return { kind: 'not_found' };

      const from = current.rows[0].verification_status;
      const transitionAllowed = transitions[from]?.has(target) || (action === 'approve' && ['request_changes', 'rejected'].includes(from));
      if (!transitionAllowed) return { kind: 'invalid', from, to: target };

      if (action === 'approve') {
        const setting = await db.query(
          `SELECT setting_value->>'value' AS method
             FROM platform_settings
            WHERE setting_key='seller_verification_method'
            LIMIT 1`
        );
        const method = setting.rows[0]?.method === 'document' ? 'document' : 'none';
        if (!transitions[from]?.has(target) && method !== 'none') {
          return { kind: 'invalid', from, to: target };
        }
        const document = await db.query(
          `SELECT id FROM seller_verification_documents WHERE user_id=$1 AND status='uploaded' FOR UPDATE`,
          [req.params.userId]
        );
        const emailApprovedOptionalSeller = method === 'none' && ['not_started', 'submitted', 'under_review', 'request_changes', 'rejected'].includes(from);
        if (!document.rowCount && !emailApprovedOptionalSeller) {
          return { kind: 'document_required' };
        }
        if (!document.rowCount && emailApprovedOptionalSeller && !note) {
          return { kind: 'email_review_note_required' };
        }
      }

      const updated = await db.query(
        `UPDATE seller_profiles
            SET verification_status=$2,
                verification_note=$3,
                verified_at=CASE WHEN $2='verified' THEN NOW() ELSE NULL END,
                updated_at=NOW()
          WHERE user_id=$1
          RETURNING user_id, display_name, legal_name, country_code, verification_status, verification_note, submitted_at, verified_at`,
        [req.params.userId, target, note]
      );
      const documentStatus = target === 'verified' ? 'approved' : target === 'rejected' ? 'rejected' : 'uploaded';
      await db.query(
        `UPDATE seller_verification_documents SET status=$2, updated_at=NOW() WHERE user_id=$1`,
        [req.params.userId, documentStatus]
      );
      await audit(db, req.user.id, `seller.verification.${action}`, req.params.userId, {
        from_status: from,
        to_status: target,
        note
      });
      return { kind: 'ok', profile: updated.rows[0] };
    });

    if (result.kind === 'not_found') return res.status(404).json({ error: 'seller_profile_not_found' });
    if (result.kind === 'invalid') {
      return res.status(409).json({ error: 'invalid_verification_transition', from: result.from, to: result.to });
    }
    if (result.kind === 'document_required') {
      return res.status(409).json({ error: 'verification_document_required' });
    }
    if (result.kind === 'email_review_note_required') {
      return res.status(400).json({ error: 'email_verification_review_note_required' });
    }
    return res.json({ profile: result.profile });
  } catch (e) { return next(e); }
});

router.get('/seller-verifications/:userId/audit', async (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  try {
    const result = await query(`SELECT a.id, a.actor_user_id, u.email AS actor_email, a.action, a.metadata, a.created_at FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.resource_type='seller' AND a.resource_id=$1 ORDER BY a.created_at DESC LIMIT 100`, [req.params.userId]);
    return res.json({ events: result.rows });
  } catch (e) { return next(e); }
});

export default router;
