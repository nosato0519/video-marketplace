import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { createConfiguredMediaStorage } from '../media/media-storage-factory.js';
import { sendSellerVerificationEmail } from '../email/smtp-mailer.js';

const router = express.Router();

async function getSellerVerificationMethod() {
  const result = await query(
    "SELECT setting_value->>'value' AS method FROM platform_settings WHERE setting_key = 'seller_verification_method' LIMIT 1"
  );
  return result.rows[0]?.method || 'document';
}
router.use(requireAuth, requireRole('seller'));

const verificationStorage = createConfiguredMediaStorage();
const MAX_VERIFICATION_DOCUMENT_BYTES = 10 * 1024 * 1024;
const VERIFICATION_DOCUMENT_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function safeDocumentFilename(value) {
  const normalized = String(value || 'identity-document').replace(/[\\u0000-\\u001f\\u007f]/g, '_').trim();
  return (normalized || 'identity-document').slice(0, 255);
}

function requiredSignatureBytes(mime) {
  return mime === 'application/pdf' ? 5 : mime === 'image/png' ? 8 : 3;
}

function signatureMatches(mime, signature) {
  if (mime === 'application/pdf') return signature.toString('ascii') === '%PDF-';
  if (mime === 'image/png') return signature.equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
}

router.get('/profile', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const result = await query(
      `SELECT sp.user_id, sp.display_name, sp.legal_name, sp.country_code, sp.bio, sp.address, sp.postal_code, sp.phone,
              sp.verification_status, sp.verification_note, sp.submitted_at, sp.verified_at, sp.created_at, sp.updated_at,
              u.email, u.email_verified_at,
              COALESCE(ps.setting_value->>'value', 'document') AS verification_method
         FROM seller_profiles sp
         JOIN users u ON u.id = sp.user_id
         LEFT JOIN platform_settings ps ON ps.setting_key = 'seller_verification_method'
        WHERE sp.user_id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.json({ profile: {
        userId: req.user.id,
        displayName: '', legalName: '', countryCode: null,
        bio: null, address: null, postalCode: null, phone: null,
        verificationStatus: 'not_started', verificationNote: null,
        submittedAt: null, verifiedAt: null,
        email: req.user.email, emailVerifiedAt: null, verificationMethod: 'document'
      }});
    }
    return res.json({ profile: result.rows[0] });
  } catch (error) { return next(error); }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const displayName = String(req.body?.displayName ?? '').trim().slice(0, 120);
    const legalName = String(req.body?.legalName ?? '').trim().slice(0, 200);
    const countryCode = req.body?.countryCode == null ? null : String(req.body.countryCode).trim().toUpperCase().slice(0, 2);
    const bio = String(req.body?.bio ?? '').trim().slice(0, 2000);
    const address = String(req.body?.address ?? '').trim().slice(0, 300);
    const postalCode = String(req.body?.postalCode ?? '').trim().slice(0, 30);
    const phone = String(req.body?.phone ?? '').trim().slice(0, 50);

    if (!displayName || !legalName) return res.status(400).json({ error: 'display_name_and_legal_name_required' });
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return res.status(400).json({ error: 'invalid_country_code' });

    const result = await query(
      `INSERT INTO seller_profiles (user_id, display_name, legal_name, country_code, bio, address, postal_code, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         legal_name = EXCLUDED.legal_name,
         country_code = EXCLUDED.country_code,
         bio = EXCLUDED.bio,
         address = EXCLUDED.address,
         postal_code = EXCLUDED.postal_code,
         phone = EXCLUDED.phone,
         updated_at = NOW()
       RETURNING user_id, display_name, legal_name, country_code, bio, address, postal_code, phone,
                 verification_status, verification_note, submitted_at, verified_at, created_at, updated_at`,
      [req.user.id, displayName, legalName, countryCode, bio || null, address || null, postalCode || null, phone || null]
    );
    return res.json({ profile: result.rows[0] });
  } catch (error) { return next(error); }
});

router.get('/profile/verification-document', async (req, res, next) => {
  try {
    const result = await query(`SELECT d.id, d.original_filename, d.mime_type, d.byte_size, d.status, d.created_at, d.updated_at, sp.verification_status AS seller_verification_status FROM seller_verification_documents d JOIN seller_profiles sp ON sp.user_id = d.user_id WHERE d.user_id = $1`, [req.user.id]);
    return res.json({ document: result.rows[0] || null });
  } catch (error) { return next(error); }
});

router.post('/profile/verification-email/send', async (req, res, next) => {
  try {
    const method = await getSellerVerificationMethod();
    if (!['email', 'email_and_document'].includes(method)) {
      return res.status(409).json({ error: 'seller_email_verification_not_required' });
    }

    const userResult = await query(
      `SELECT email, email_verified_at FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user?.email) return res.status(400).json({ error: 'seller_email_required' });
    if (user.email_verified_at) return res.json({ verified: true });

    const recent = await query(
      `SELECT created_at
         FROM email_verification_tokens
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [req.user.id]
    );
    if (recent.rows[0] && Date.now() - new Date(recent.rows[0].created_at).getTime() < 60_000) {
      return res.status(429).json({ error: 'verification_email_rate_limited' });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query(`DELETE FROM email_verification_tokens WHERE user_id = $1 AND consumed_at IS NULL`, [req.user.id]);
    await query(
      `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')`,
      [crypto.randomUUID(), req.user.id, tokenHash]
    );

    const baseUrl = String(process.env.APP_BASE_URL || '').trim().replace(/\/$/, '');
    if (!baseUrl) return res.status(503).json({ error: 'app_base_url_configuration_missing' });
    const verificationUrl = `${baseUrl}/seller/verification.html?email_verification_token=${encodeURIComponent(token)}`;
    try {
      await sendSellerVerificationEmail({ email: user.email, verificationUrl });
    } catch (error) {
      await query(`DELETE FROM email_verification_tokens WHERE token_hash = $1`, [tokenHash]).catch(() => {});
      throw error;
    }

    return res.json({ verified: false, sent: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/profile/verification-document', async (req, res, next) => {
  let uploadedStorageKey = null;
  const mime = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const filename = safeDocumentFilename(req.headers['x-original-filename']);
  const declaredLength = req.headers['content-length'] == null ? null : Number(req.headers['content-length']);
  if (!VERIFICATION_DOCUMENT_MIME.has(mime)) return res.status(415).json({ error: 'unsupported_verification_document_type' });
  if (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength <= 0)) return res.status(400).json({ error: 'invalid_content_length' });
  if (declaredLength !== null && declaredLength > MAX_VERIFICATION_DOCUMENT_BYTES) return res.status(413).json({ error: 'verification_document_too_large' });

  try {
    const profile = await query(`SELECT verification_status FROM seller_profiles WHERE user_id = $1`, [req.user.id]);
    const status = profile.rows[0]?.verification_status;
    if (!profile.rowCount) return res.status(400).json({ error: 'seller_profile_required' });
    if (!['not_started', 'request_changes', 'rejected'].includes(status)) return res.status(409).json({ error: 'verification_document_locked' });

    const id = crypto.randomUUID();
    const extension = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
    const storageKey = `verification-documents/${req.user.id}/${id}${extension}`;
    uploadedStorageKey = storageKey;
    const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
    if (!rawBody?.length) return res.status(400).json({ error: 'verification_document_required' });
    const bytes = rawBody.length;
    if (bytes > MAX_VERIFICATION_DOCUMENT_BYTES) return res.status(413).json({ error: 'verification_document_too_large' });
    const body = Readable.from([rawBody]);
    await verificationStorage.putStream({ storageKey, stream: body });
    if (declaredLength !== null && bytes !== declaredLength) throw Object.assign(new Error('content_length_mismatch'), { statusCode: 400 });
    const inspected = await verificationStorage.getStream({ storageKey, range: { start: 0, end: requiredSignatureBytes(mime) - 1 } });
    const chunks = [];
    for await (const chunk of inspected.stream) chunks.push(chunk);
    if (!signatureMatches(mime, Buffer.concat(chunks))) throw Object.assign(new Error('invalid_verification_document'), { statusCode: 415 });

    const previous = await query(`SELECT storage_key FROM seller_verification_documents WHERE user_id = $1`, [req.user.id]);
    const result = await query(`INSERT INTO seller_verification_documents (id, user_id, storage_key, original_filename, mime_type, byte_size) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO UPDATE SET storage_key=EXCLUDED.storage_key, original_filename=EXCLUDED.original_filename, mime_type=EXCLUDED.mime_type, byte_size=EXCLUDED.byte_size, status='uploaded', updated_at=NOW() RETURNING id, original_filename, mime_type, byte_size, status, created_at, updated_at`, [id, req.user.id, storageKey, filename, mime, bytes]);
    if (previous.rows[0]?.storage_key && previous.rows[0].storage_key !== storageKey) await verificationStorage.deleteObject({ storageKey: previous.rows[0].storage_key }).catch(() => {});
    return res.status(201).json({ document: result.rows[0] });
  } catch (error) {
    if (uploadedStorageKey) await verificationStorage.deleteObject({ storageKey: uploadedStorageKey }).catch(() => {});
    return next(error);
  }
});

router.post('/profile/submit-verification', async (req, res, next) => {
  try {
    const existing = await query(`SELECT display_name, legal_name, country_code, verification_status FROM seller_profiles WHERE user_id = $1`, [req.user.id]);
    const profile = existing.rows[0];
    if (!profile?.display_name || !profile.legal_name || !profile.country_code) return res.status(400).json({ error: 'complete_seller_profile_first' });
    const verificationMethod = await getSellerVerificationMethod();
    if (profile.verification_status === 'verified') return res.status(409).json({ error: 'seller_already_verified' });
    if (verificationMethod === 'email') {
      const email = await query(`SELECT email_verified_at FROM users WHERE id = $1`, [req.user.id]);
      if (!email.rows[0]?.email_verified_at) return res.status(400).json({ error: 'email_verification_required' });
      const result = await query(
        `UPDATE seller_profiles
            SET verification_status = 'verified', submitted_at = COALESCE(submitted_at, NOW()), verified_at = COALESCE(verified_at, NOW()), verification_note = NULL, updated_at = NOW()
          WHERE user_id = $1
        RETURNING user_id, display_name, legal_name, country_code, verification_status, submitted_at, verified_at`,
        [req.user.id]
      );
      return res.json({ profile: result.rows[0] });
    }
    if (verificationMethod === 'document' || verificationMethod === 'email_and_document') {
      const document = await query(`SELECT id, status FROM seller_verification_documents WHERE user_id = $1`, [req.user.id]);
      if (!document.rowCount || document.rows[0].status !== 'uploaded') return res.status(400).json({ error: 'verification_document_required' });
    }
    if (verificationMethod === 'email_and_document') {
      const email = await query(`SELECT email_verified_at FROM users WHERE id = $1`, [req.user.id]);
      if (!email.rows[0]?.email_verified_at) return res.status(400).json({ error: 'email_verification_required' });
    }
    if (profile.verification_status === 'submitted' || profile.verification_status === 'under_review') return res.status(409).json({ error: 'verification_already_submitted' });

    const result = await query(
      `UPDATE seller_profiles
          SET verification_status = 'submitted', submitted_at = NOW(), verification_note = NULL, updated_at = NOW()
        WHERE user_id = $1
      RETURNING user_id, display_name, legal_name, country_code, verification_status, submitted_at, verified_at`,
      [req.user.id]
    );
    return res.json({ profile: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
