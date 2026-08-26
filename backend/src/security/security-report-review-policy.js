export function buildReportReviewItem({ report, now = new Date() }) {
  if (!report?.reporterId || !report?.category || !report?.createdAt) throw new Error('invalid_security_report');
  return {
    reportId: report.id ?? null,
    reporterId: report.reporterId,
    category: report.category,
    details: report.details,
    status: 'pending',
    priority: report.category === 'fraud' || report.category === 'account_takeover' ? 'high' : 'normal',
    createdAt: report.createdAt,
    queuedAt: now.toISOString(),
  };
}

export function assignReportReviewer({ item, reviewerId }) {
  if (!item || item.status !== 'pending') throw new Error('report_not_assignable');
  if (!reviewerId) throw new Error('reviewer_required');
  return { ...item, status: 'in_review', reviewerId, assignedAt: new Date().toISOString() };
}

export function resolveReport({ item, reviewerId, resolution, now = new Date() }) {
  if (!item || item.status !== 'in_review') throw new Error('report_not_reviewable');
  if (!reviewerId || typeof resolution !== 'string' || resolution.trim().length < 3) throw new Error('invalid_resolution');
  return { ...item, status: 'resolved', reviewerId, resolution: resolution.trim(), resolvedAt: now.toISOString() };
}
