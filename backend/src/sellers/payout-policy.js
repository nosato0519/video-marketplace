const MINIMUM_PAYOUT = 1000;

export function calculatePayoutableAmount({ grossAmount, refundedAmount, platformFeeAmount = 0, alreadyPaidOut = 0 }) {
  const gross = Number(grossAmount || 0);
  const refunds = Number(refundedAmount || 0);
  const fees = Number(platformFeeAmount || 0);
  const paidOut = Number(alreadyPaidOut || 0);
  const amount = gross - refunds - fees - paidOut;
  return Math.max(0, Math.round(amount * 100) / 100);
}

export function validatePayoutRequest({ user, amount, payoutableAmount }) {
  if (!user) throw new Error('authentication_required');
  if (user.role !== 'seller') throw new Error('forbidden');
  const requested = Number(amount);
  const available = Number(payoutableAmount);
  if (!Number.isFinite(requested) || requested <= 0) throw new Error('invalid_payout_amount');
  if (requested > available) throw new Error('insufficient_payoutable_balance');
  if (requested < MINIMUM_PAYOUT) throw new Error('minimum_payout_not_reached');
  return { amount: Math.round(requested * 100) / 100 };
}
