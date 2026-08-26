import { reservePaymentEvent } from './idempotency-key.js';
import { completePaidOrder } from './complete-order.js';

export async function handlePaymentSucceeded({ provider, eventId, orderId, paymentReference }) {
  const event = await reservePaymentEvent({ provider, eventId, orderId });

  // A duplicate webhook has already been reserved and must not mutate the order again.
  if (!event) return { duplicate: true };

  const result = await completePaidOrder({ orderId, paymentReference });
  return { duplicate: false, ...result };
}
