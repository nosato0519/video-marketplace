export const PAYOUT_STATES = Object.freeze([
  'requested',
  'reviewing',
  'approved',
  'processing',
  'paid',
  'failed',
  'cancelled',
]);

const TRANSITIONS = new Map([
  ['requested', new Set(['reviewing', 'cancelled'])],
  ['reviewing', new Set(['approved', 'cancelled'])],
  ['approved', new Set(['processing', 'cancelled'])],
  ['processing', new Set(['paid', 'failed'])],
  ['failed', new Set(['processing', 'cancelled'])],
  ['paid', new Set()],
  ['cancelled', new Set()],
]);

export function canTransitionPayout(from, to) {
  return Boolean(TRANSITIONS.get(from)?.has(to));
}

export function assertPayoutManager(user) {
  if (!user) throw new Error('authentication_required');
  if (!['moderator', 'admin'].includes(user.role)) throw new Error('forbidden');
}

export function applyPayoutDecision({ user, payout, decision }) {
  assertPayoutManager(user);
  if (!payout) throw new Error('payout_not_found');

  if (decision === 'approve') {
    if (!canTransitionPayout(payout.status, 'approved')) throw new Error('invalid_payout_transition');
    return { ...payout, status: 'approved', reviewed_by: user.id };
  }

  if (decision === 'cancel') {
    if (!canTransitionPayout(payout.status, 'cancelled')) throw new Error('invalid_payout_transition');
    return { ...payout, status: 'cancelled', reviewed_by: user.id };
  }

  throw new Error('invalid_payout_decision');
}
