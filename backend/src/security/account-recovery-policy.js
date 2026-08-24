const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export function buildPasswordResetRequest({ userId, tokenHash, now = new Date() }) {
  if (!userId || !tokenHash) throw new Error('invalid_reset_request');
  return {
    userId,
    tokenHash,
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS).toISOString(),
    usedAt: null,
  };
}

export function assertResetTokenUsable({ resetRequest, now = new Date() }) {
  if (!resetRequest || resetRequest.usedAt) throw new Error('reset_token_invalid');
  if (new Date(resetRequest.expiresAt).getTime() <= now.getTime()) throw new Error('reset_token_expired');
  return true;
}

export function invalidateUserSessionsAfterPasswordReset({ sessions }) {
  return (sessions ?? []).map((session) => ({ ...session, revokedAt: session.revokedAt ?? new Date().toISOString() }));
}
