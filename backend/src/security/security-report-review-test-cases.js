import { buildReportReviewItem, assignReportReviewer, resolveReport } from './security-report-review-policy.js';

export function runSecurityReportReviewRegressionSuite() {
  const report = {
    id: 'r1',
    reporterId: 'u1',
    category: 'fraud',
    details: 'Suspicious transaction activity',
    createdAt: '2026-08-26T00:00:00.000Z',
  };
  const queued = buildReportReviewItem({ report });
  const assigned = assignReportReviewer({ item: queued, reviewerId: 'admin-1' });
  const resolved = resolveReport({ item: assigned, reviewerId: 'admin-1', resolution: 'Confirmed and actioned' });

  return {
    highPriority: queued.priority === 'high',
    assignmentWorks: assigned.status === 'in_review' && assigned.reviewerId === 'admin-1',
    resolutionWorks: resolved.status === 'resolved' && resolved.reviewerId === 'admin-1',
  };
}
