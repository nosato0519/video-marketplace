import { buildAccountAction } from './admin-account-action-policy.js';

const TARGET_STATUS = Object.freeze({
  suspend: 'suspended',
  lock: 'locked',
  restore: 'active',
});

export function applyAdminAccountAction({ actor, targetUser, action, reason, now = new Date() }) {
  if (!targetUser?.id) throw new Error('target_user_required');
  const audit = buildAccountAction({ actor, targetUserId: targetUser.id, action, reason, now });

  return {
    user: {
      ...targetUser,
      status: TARGET_STATUS[action],
      updatedAt: now.toISOString(),
    },
    audit,
    revokeSessions: action === 'suspend' || action === 'lock',
  };
}
