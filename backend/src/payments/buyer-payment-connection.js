import { selectPaymentProvider } from './payment-provider-selection.js';

const connections = new Map();

function key(buyerId, providerId) {
  return `${buyerId}:${providerId}`;
}

export function saveBuyerPaymentConnection({ buyerId, providerId, region = 'global', currency = null, credentialRef } = {}) {
  if (!buyerId) throw new Error('buyer_required');
  if (!credentialRef) throw new Error('payment_credential_reference_required');

  const selection = selectPaymentProvider({ providerId, region, currency });
  const record = {
    buyerId,
    providerId: selection.id,
    providerName: selection.name,
    region: selection.region,
    currency: selection.currency,
    credentialRef,
    status: 'connected',
    updatedAt: new Date().toISOString(),
  };

  connections.set(key(buyerId, providerId), record);
  return { ...record };
}

export function getBuyerPaymentConnections(buyerId) {
  if (!buyerId) throw new Error('buyer_required');
  return [...connections.values()]
    .filter((record) => record.buyerId === buyerId)
    .map(({ credentialRef: _credentialRef, ...safe }) => safe);
}

export function removeBuyerPaymentConnection({ buyerId, providerId } = {}) {
  if (!buyerId) throw new Error('buyer_required');
  if (!providerId) throw new Error('payment_provider_required');
  return connections.delete(key(buyerId, providerId));
}
