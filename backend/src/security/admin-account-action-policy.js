const ALLOWED_ACTIONS = new Set(['suspend', 'lock', 'restore']);

export function assertAdminAction({ actor, targetUserId, action }) {
  if (!actor || actor.role !== 'admin') throw new Error('admin_required');
  if (!targetUserId || !ALLOWED_ACTIONS.has(action)) throw new Error('invalid_account_action');
  if (actor.id === targetUserId) throw new Error('self_action_forbidden');
  return true;
}

export function buildAccountAction({ actor, targetUserId, action, reason, now = new Date() }) {
  assertAdminAction({ actor, targetUserId, action });
  if (typeof reason !== 'string' || reason.trim().length < 3) throw new Error('action_reason_required');
  return {
    targetUserId,
    action,
    reason: reason.trim(),
    performedBy: actor.id,
    createdAt: now.toISOString(),
  };
}
