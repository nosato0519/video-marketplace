import { buildSecurityAlert } from './security-event-policy.js';

export function buildAdminReviewQueue({ events = [] }) {
  return events
    .map((event) => buildSecurityAlert({ event }))
    .filter((alert) => alert.requiresReview)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function markAlertReviewed({ alert, reviewerId, now = new Date() }) {
  if (!alert?.requiresReview) throw new Error('alert_not_reviewable');
  if (!reviewerId) throw new Error('reviewer_required');
  return {
    ...alert,
    reviewedBy: reviewerId,
    reviewedAt: now.toISOString(),
  };
}
