const ALLOWED_STATUSES = new Set(['active', 'suspended', 'locked', 'deleted']);

export function assertAccountStatus(status) {
  if (!ALLOWED_STATUSES.has(status)) throw new Error('invalid_account_status');
  return status;
}

export function assertLoginAllowed({ status }) {
  assertAccountStatus(status);
  if (status !== 'active') throw new Error('account_login_blocked');
  return true;
}

export function buildSecurityEvent({ userId, type, ipAddress = null, now = new Date() }) {
  if (!userId || !type) throw new Error('invalid_security_event');
  return {
    userId,
    type,
    ipAddress,
    createdAt: now.toISOString(),
  };
}
