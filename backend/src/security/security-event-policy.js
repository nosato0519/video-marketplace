const HIGH_RISK_EVENTS = new Set([
  'login_failed_limit',
  'password_reset_requested',
  'password_reset_completed',
  'session_revoked',
  'account_locked',
  'account_suspended',
]);

export function classifySecurityEvent(type) {
  return HIGH_RISK_EVENTS.has(type) ? 'high' : 'normal';
}

export function buildSecurityAlert({ event }) {
  if (!event?.userId || !event?.type) throw new Error('invalid_security_event');
  const severity = classifySecurityEvent(event.type);
  return {
    userId: event.userId,
    eventType: event.type,
    severity,
    requiresReview: severity === 'high',
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
}
