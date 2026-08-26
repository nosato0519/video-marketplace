const DEFAULT_RETENTION_DAYS = 180;

export function buildReportRetentionPolicy({ retentionDays = DEFAULT_RETENTION_DAYS } = {}) {
  if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 3650) throw new Error('invalid_retention_period');
  return { retentionDays, evidenceIncluded: true, auditTrailIncluded: true };
}

export function isReportEligibleForPurge({ report, now = Date.now(), retentionDays = DEFAULT_RETENTION_DAYS }) {
  if (!report?.resolvedAt) return false;
  const resolvedAt = new Date(report.resolvedAt).getTime();
  return now - resolvedAt >= retentionDays * 24 * 60 * 60 * 1000;
}

export function buildPurgeRecord({ reportId, reason = 'retention_expired', now = new Date() }) {
  if (!reportId) throw new Error('report_required');
  return { reportId, reason, purgedAt: now.toISOString() };
}
