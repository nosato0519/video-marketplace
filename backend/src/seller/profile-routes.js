import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { createConfiguredMediaStorage } from '../media/media-storage-factory.js';

const router = express.Router();
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
      `SELECT user_id, display_name, legal_name, country_code, bio, address, postal_code, phone,
              verification_status, verification_note, submitted_at, verified_at, created_at, updated_at
         FROM seller_profiles WHERE user_id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.json({ profile: {
        userId: req.user.id,
        displayName: '', legalName: '', countryCode: null,
        bio: null, address: null, postalCode: null, phone: null,
        verificationStatus: 'not_started', verificationNote: null,
        submittedAt: null, verifiedAt: null
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
    const result = await query(`SELECT id, original_filename, mime_type, byte_size, status, created_at, updated_at FROM seller_verification_documents WHERE user_id = $1`, [req.user.id]);
    return res.json({ document: result.rows[0] || null });
  } catch (error) { return next(error); }
});

router.post('/profile/verification-document', async (req, res, next) => {
  let uploadedStorageKey = null;
  const mime = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const filename = safeDocumentFilename(req.headers['x-original-filename']);
  const declaredLength = req.headers['content-length'] == null ? null : Number(req.headers['content-length']);
  if (!VERIFICATION_DOCUMENT_MIME.has(mime)) return res.status(415).json({ error: 'unsupported_verification_document_type' });
  if (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength <= 0)) return res.status(400).json({ error: 'invalid_content_length' });
  if (declaredLength !== null && declaredLength > MAX_VERIFICATION_DOCUMENT_BYTES) return res.status(413).json({ error: 'verification_document_too_large' });
  if (!req.readable) return res.status(400).json({ error: 'verification_document_required' });

  try {
    const profile = await query(`SELECT verification_status FROM seller_profiles WHERE user_id = $1`, [req.user.id]);
    const status = profile.rows[0]?.verification_status;
    if (!profile.rowCount) return res.status(400).json({ error: 'seller_profile_required' });
    if (!['not_started', 'request_changes', 'rejected'].includes(status)) return res.status(409).json({ error: 'verification_document_locked' });

    const id = crypto.randomUUID();
    const extension = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
    const storageKey = `verification-documents/${req.user.id}/${id}${extension}`;
    uploadedStorageKey = storageKey;
    let bytes = 0;
    const body = Readable.from((async function* () {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_VERIFICATION_DOCUMENT_BYTES) throw Object.assign(new Error('verification_document_too_large'), { statusCode: 413 });
        yield chunk;
      }
    })());
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
    if (error?.message?.startsWith('invalid_verification_document') || error?.message?.startsWith('content_length_mismatch') || error?.statusCode === 413) {
      if (uploadedStorageKey) await verificationStorage.deleteObject({ storageKey: uploadedStorageKey }).catch(() => {});
    }
    return next(error);
  }
});

router.post('/profile/submit-verification', async (req, res, next) => {
  try {
    const existing = await query(`SELECT display_name, legal_name, country_code, verification_status FROM seller_profiles WHERE user_id = $1`, [req.user.id]);
    const profile = existing.rows[0];
    if (!profile?.display_name || !profile.legal_name || !profile.country_code) return res.status(400).json({ error: 'complete_seller_profile_first' });
    const document = await query(`SELECT id, status FROM seller_verification_documents WHERE user_id = $1`, [req.user.id]);
    if (!document.rowCount) return res.status(400).json({ error: 'verification_document_required' });
    if (profile.verification_status === 'verified') return res.status(409).json({ error: 'seller_already_verified' });
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
