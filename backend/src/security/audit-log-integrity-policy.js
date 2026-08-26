import { createHash } from 'node:crypto';

export function canonicalizeAuditEntry(entry) {
  if (!entry?.action || !entry?.performedBy || !entry?.createdAt) throw new Error('invalid_audit_entry');
  return JSON.stringify({
    action: entry.action,
    performedBy: entry.performedBy,
    targetUserId: entry.targetUserId ?? null,
    reason: entry.reason ?? null,
    createdAt: entry.createdAt,
  });
}

export function buildAuditIntegrityHash({ entry, previousHash = '' }) {
  const payload = `${previousHash}:${canonicalizeAuditEntry(entry)}`;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function verifyAuditChain({ entries = [] }) {
  let previousHash = '';
  for (const entry of entries) {
    const expected = buildAuditIntegrityHash({ entry, previousHash });
    if (entry.integrityHash !== expected) return false;
    previousHash = expected;
  }
  return true;
}
