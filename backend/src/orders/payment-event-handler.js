import { reservePaymentEvent } from './idempotency-key.js';
import { completePaidOrder } from './complete-order.js';
import { markPaymentEventProcessed, markPaymentEventFailed } from './payment-event-status.js';

export async function handlePaymentSucceeded({ provider, eventId, orderId, paymentReference }) {
  const event = await reservePaymentEvent({ provider, eventId, orderId });

  // A duplicate webhook has already been reserved and must not mutate the order again.
  if (!event) return { duplicate: true };

  try {
    const result = await completePaidOrder({ orderId, paymentReference });
    await markPaymentEventProcessed({ provider, eventId });
    return { duplicate: false, ...result };
  } catch (error) {
    await markPaymentEventFailed({ provider, eventId });
    throw error;
  }
}
