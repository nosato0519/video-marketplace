const ALLOWED_ROLES = new Set(['admin', 'reviewer']);

export function authorizeEvidenceAccess({ actor, report }) {
  if (!actor?.id || !ALLOWED_ROLES.has(actor.role)) throw new Error('evidence_access_forbidden');
  if (!report?.id) throw new Error('report_required');
  if (report.status !== 'in_review' && report.status !== 'resolved') throw new Error('evidence_access_invalid_state');
  return true;
}

export function buildEvidenceAccessAudit({ actor, report, now = new Date() }) {
  authorizeEvidenceAccess({ actor, report });
  return {
    action: 'evidence_accessed',
    performedBy: actor.id,
    reportId: report.id,
    createdAt: now.toISOString(),
  };
}
