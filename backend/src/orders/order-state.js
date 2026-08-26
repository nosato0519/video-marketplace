export const ORDER_STATES = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
});

const transitions = Object.freeze({
  pending: new Set(['paid', 'cancelled']),
  paid: new Set(['refunded']),
  cancelled: new Set(),
  refunded: new Set()
});

export function canTransitionOrder(from, to) {
  return transitions[from]?.has(to) ?? false;
}
