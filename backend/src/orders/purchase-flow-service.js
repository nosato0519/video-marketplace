import { getProductForOrder } from './product-for-order.js';
import { hasActiveEntitlement } from './active-entitlement.js';
import { createPendingOrder } from './create-order-policy.js';
import { createCheckoutSession } from './checkout-service.js';
import { validatePurchaseFlowResult } from './purchase-flow-validation.js';
import { validateProviderCheckout } from '../payments/provider-checkout-policy.js';

export async function startPurchaseFlow({ user, productId }) {
  if (!user) throw new Error('authentication_required');
  if (!productId) throw new Error('product_required');

  const product = await getProductForOrder(productId);
  if (!product) throw new Error('product_not_found');

  const existingActiveEntitlement = await hasActiveEntitlement(user.id, product.id);
  const order = await createPendingOrder({ user, product, existingActiveEntitlement });
  const checkout = await createCheckoutSession({ orderId: order.id, userId: user.id });

  validatePurchaseFlowResult({ order, checkout });
  validateProviderCheckout({ order, checkout });

  return { order, checkout };
}
