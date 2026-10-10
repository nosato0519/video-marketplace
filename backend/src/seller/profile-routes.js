import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { createConfiguredMediaStorage } from '../media/media-storage-factory.js';

const router = express.Router();

async function getSellerVerificationMethod() {
  const result = await query(
    "SELECT setting_value->>'value' AS method FROM platform_settings WHERE setting_key = 'seller_verification_method' LIMIT 1"
  );
  const method = result.rows[0]?.method;
  return ['email', 'document'].includes(method) ? method : 'none';
}
router.use(requireAuth, requireRole('seller'));

const verificationStorage = createConfiguredMediaStorage();
const MAX_VERIFICATION_DOCUMENT_BYTES = 10 * 1024 * 1024;
const VERIFICATION_DOCUMENT_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function safeDocumentFilename(value) {
  const normalized = String(value || 'identity-document').replace(/[\u0000-\u001f\u007f]/g, '_').trim();
  return (normalized || 'identity-document').slice(0, 255);
}

function originalDocumentFilename(req) {
  const value = req.headers['x-original-filename'];
  if (req.headers['x-original-filename-encoded'] === '1') {
    try { return safeDocumentFilename(decodeURIComponent(String(value || ''))); }
    catch { return 'identity-document'; }
  }
  return safeDocumentFilename(value);
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
              CASE WHEN ps.setting_value->>'value' IN ('email', 'document') THEN ps.setting_value->>'value' ELSE 'none' END AS verification_method,
              COALESCE((SELECT setting_value->>'value' FROM platform_settings WHERE setting_key = 'operator_email' LIMIT 1), '') AS operator_email
         FROM seller_profiles sp
         LEFT JOIN platform_settings ps ON ps.setting_key = 'seller_verification_method'
        WHERE sp.user_id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      const [verificationMethod, operatorEmailResult] = await Promise.all([
        getSellerVerificationMethod(),
        query("SELECT setting_value->>'value' AS value FROM platform_settings WHERE setting_key = 'operator_email' LIMIT 1")
      ]);
      return res.json({ profile: {
        user_id: req.user.id,
        display_name: '',
        legal_name: '',
        country_code: null,
        bio: null,
        address: null,
        postal_code: null,
        phone: null,
        verification_status: 'not_started',
        verification_note: null,
        submitted_at: null,
        verified_at: null,
        verification_method: verificationMethod,
        operator_email: operatorEmailResult.rows[0]?.value || ''
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

    const saved = await withTransaction(async (db) => {
      const existing = await db.query(
        `SELECT verification_status, legal_name, country_code, address, postal_code, phone
           FROM seller_profiles WHERE user_id = $1 FOR UPDATE`,
        [req.user.id]
      );
      const current = existing.rows[0];
      if (
        current &&
        ['submitted', 'under_review', 'verified'].includes(current.verification_status) &&
        (
          current.legal_name !== legalName ||
          current.country_code !== countryCode ||
          (current.address || '') !== (address || '') ||
          (current.postal_code || '') !== (postalCode || '') ||
          (current.phone || '') !== (phone || '')
        )
      ) {
        return { kind: 'identity_locked' };
      }

      const result = await db.query(
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
      return { kind: 'ok', profile: result.rows[0] };
    });
    if (saved.kind === 'identity_locked') {
      return res.status(409).json({ error: 'verified_identity_fields_locked' });
    }
    return res.json({ profile: saved.profile });
  } catch (error) { return next(error); }
});

router.get('/profile/verification-document', async (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  try {
    const result = await query(
      `SELECT sp.verification_status AS seller_verification_status,
              d.id, d.original_filename, d.mime_type, d.byte_size, d.status, d.created_at, d.updated_at
         FROM seller_profiles sp
         LEFT JOIN seller_verification_documents d ON d.user_id = sp.user_id
        WHERE sp.user_id = $1`,
      [req.user.id]
    );
    const row = result.rows[0];
    const document = row?.id ? {
      id: row.id,
      original_filename: row.original_filename,
      mime_type: row.mime_type,
      byte_size: row.byte_size,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      seller_verification_status: row.seller_verification_status
    } : null;
    return res.json({
      document,
      verificationStatus: row?.seller_verification_status || null
    });
  } catch (error) { return next(error); }
});

router.post('/profile/verification-document', async (req, res, next) => {
  let uploadedStorageKey = null;
  const mime = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const filename = originalDocumentFilename(req);
  const declaredLength = req.headers['content-length'] == null ? null : Number(req.headers['content-length']);
  if (!VERIFICATION_DOCUMENT_MIME.has(mime)) return res.status(415).json({ error: 'unsupported_verification_document_type' });
  if (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength <= 0)) return res.status(400).json({ error: 'invalid_content_length' });
  if (declaredLength !== null && declaredLength > MAX_VERIFICATION_DOCUMENT_BYTES) return res.status(413).json({ error: 'verification_document_too_large' });

  try {
    const verificationMethod = await getSellerVerificationMethod();
    if (verificationMethod !== 'document') {
      return res.status(409).json({ error: verificationMethod === 'email' ? 'document_upload_not_available_for_email_verification' : 'seller_verification_not_required' });
    }
    const profile = await query(
      `SELECT sp.verification_status, svd.status AS verification_document_status
         FROM seller_profiles sp
         LEFT JOIN seller_verification_documents svd ON svd.user_id = sp.user_id
        WHERE sp.user_id = $1`,
      [req.user.id]
    );
    const status = profile.rows[0]?.verification_status;
    const canReplaceEmailApproval = status === 'verified' && profile.rows[0]?.verification_document_status !== 'approved';
    if (!profile.rowCount) return res.status(400).json({ error: 'seller_profile_required' });
    if (!['not_started', 'request_changes', 'rejected'].includes(status) && !canReplaceEmailApproval) {
      return res.status(409).json({ error: 'verification_document_locked' });
    }

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

    const saved = await withTransaction(async (db) => {
      const lockedProfile = await db.query(
        `SELECT sp.verification_status, svd.status AS verification_document_status
           FROM seller_profiles sp
           LEFT JOIN seller_verification_documents svd ON svd.user_id = sp.user_id
          WHERE sp.user_id = $1
          FOR UPDATE OF sp`,
        [req.user.id]
      );
      const currentStatus = lockedProfile.rows[0]?.verification_status;
      const canReplaceEmailApproval = currentStatus === 'verified'
        && lockedProfile.rows[0]?.verification_document_status !== 'approved';
      if (!lockedProfile.rowCount) return { kind: 'profile_required' };
      if (!['not_started', 'request_changes', 'rejected'].includes(currentStatus) && !canReplaceEmailApproval) {
        return { kind: 'locked' };
      }

      const previous = await db.query(
        `SELECT storage_key FROM seller_verification_documents WHERE user_id = $1 FOR UPDATE`,
        [req.user.id]
      );
      const result = await db.query(
        `INSERT INTO seller_verification_documents (id, user_id, storage_key, original_filename, mime_type, byte_size)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id) DO UPDATE SET
           storage_key=EXCLUDED.storage_key,
           original_filename=EXCLUDED.original_filename,
           mime_type=EXCLUDED.mime_type,
           byte_size=EXCLUDED.byte_size,
           status='uploaded',
           updated_at=NOW()
         RETURNING id, original_filename, mime_type, byte_size, status, created_at, updated_at`,
        [id, req.user.id, storageKey, filename, mime, bytes]
      );
      if (canReplaceEmailApproval) {
        await db.query(
          `UPDATE seller_profiles
              SET verification_status = 'not_started',
                  submitted_at = NULL,
                  verified_at = NULL,
                  verification_note = NULL,
                  updated_at = NOW()
            WHERE user_id = $1`,
          [req.user.id]
        );
      }
      return { kind: 'ok', document: result.rows[0], previousStorageKey: previous.rows[0]?.storage_key || null };
    });
    if (saved.kind !== 'ok') {
      await verificationStorage.deleteObject({ storageKey }).catch(() => {});
      uploadedStorageKey = null;
      if (saved.kind === 'profile_required') return res.status(400).json({ error: 'seller_profile_required' });
      return res.status(409).json({ error: 'verification_document_locked' });
    }
    uploadedStorageKey = null;
    if (saved.previousStorageKey && saved.previousStorageKey !== storageKey) {
      await verificationStorage.deleteObject({ storageKey: saved.previousStorageKey }).catch(() => {});
    }
    return res.status(201).json({ document: saved.document });
  } catch (error) {
    if (uploadedStorageKey) await verificationStorage.deleteObject({ storageKey: uploadedStorageKey }).catch(() => {});
    return next(error);
  }
});

router.post('/profile/submit-verification', async (req, res, next) => {
  try {
    const verificationMethod = await getSellerVerificationMethod();
    if (verificationMethod !== 'document') {
      return res.status(409).json({ error: verificationMethod === 'email' ? 'document_submission_not_available_for_email_verification' : 'seller_verification_not_required' });
    }

    const result = await withTransaction(async (db) => {
      const existing = await db.query(
        `SELECT display_name, legal_name, country_code, verification_status
           FROM seller_profiles WHERE user_id = $1 FOR UPDATE`,
        [req.user.id]
      );
      const profile = existing.rows[0];
      if (!profile?.display_name || !profile.legal_name || !profile.country_code) {
        return { kind: 'profile_incomplete' };
      }
      if (profile.verification_status === 'verified') return { kind: 'already_verified' };
      if (profile.verification_status === 'submitted' || profile.verification_status === 'under_review') {
        return { kind: 'already_submitted' };
      }
      if (!['not_started', 'request_changes', 'rejected'].includes(profile.verification_status)) {
        return { kind: 'invalid_status' };
      }

      const document = await db.query(
        `SELECT id, status FROM seller_verification_documents WHERE user_id = $1 FOR UPDATE`,
        [req.user.id]
      );
      if (!document.rowCount || document.rows[0].status !== 'uploaded') {
        return { kind: 'document_required' };
      }

      const updated = await db.query(
        `UPDATE seller_profiles
            SET verification_status = 'submitted', submitted_at = NOW(), verification_note = NULL, updated_at = NOW()
          WHERE user_id = $1
        RETURNING user_id, display_name, legal_name, country_code, verification_status, submitted_at, verified_at`,
        [req.user.id]
      );
      return { kind: 'ok', profile: updated.rows[0] };
    });

    if (result.kind === 'profile_incomplete') return res.status(400).json({ error: 'complete_seller_profile_first' });
    if (result.kind === 'already_verified') return res.status(409).json({ error: 'seller_already_verified' });
    if (result.kind === 'already_submitted') return res.status(409).json({ error: 'verification_already_submitted' });
    if (result.kind === 'invalid_status') return res.status(409).json({ error: 'invalid_verification_status' });
    if (result.kind === 'document_required') return res.status(400).json({ error: 'verification_document_required' });
    return res.json({ profile: result.profile });
  } catch (error) { return next(error); }
});

export default router;
