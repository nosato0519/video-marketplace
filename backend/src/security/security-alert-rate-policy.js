const WINDOW_MS = 60 * 60 * 1000;
const ALERT_THRESHOLD = 3;

export function countRecentHighRiskAlerts({ alerts = [], userId, now = Date.now() }) {
  return alerts.filter((alert) => alert.userId === userId && alert.severity === 'high' && now - new Date(alert.createdAt).getTime() < WINDOW_MS).length;
}

export function shouldEscalateSecurityAlert({ alerts, userId, now = Date.now() }) {
  return countRecentHighRiskAlerts({ alerts, userId, now }) >= ALERT_THRESHOLD;
}

export function buildEscalation({ userId, reason = 'repeated_high_risk_events', now = new Date() }) {
  if (!userId) throw new Error('user_required');
  return { userId, reason, severity: 'critical', createdAt: now.toISOString(), requiresAdminAction: true };
}
