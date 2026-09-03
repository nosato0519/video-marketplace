import { query } from '../db.js';
import { getPaymentProviderConfig } from './payment-provider-catalog.js';
import { getPaymentProviderSecretEnv, validatePaymentProviderConfig } from './payment-provider-config.js';
import { selectPaymentProvider } from './payment-provider-selection.js';

const CONFIGURED_PROVIDERS = new Map();

function mapRecord(row) {
  return {
    ownerId: row.owner_id ?? row.ownerId,
    providerId: row.provider_id ?? row.providerId,
    name: row.name,
    region: row.region,
    currency: row.currency,
    status: row.status,
    secretEnv: row.secret_env ?? row.secretEnv,
    configuredAt: row.configured_at instanceof Date
      ? row.configured_at.toISOString()
      : String(row.configured_at ?? row.configuredAt),
  };
}

export function configurePaymentProvider({ ownerId, providerId, region = 'global', currency = null, credentials } = {}) {
  if (!ownerId) throw new Error('payment_owner_required');

  const selection = selectPaymentProvider({ providerId, region, currency });
  const config = getPaymentProviderConfig(providerId);
  if (!config) throw new Error(`unsupported_payment_provider:${providerId}`);

  const validated = validatePaymentProviderConfig({ providerId, credentials });
  const key = `${ownerId}:${providerId}`;
  const record = {
    ownerId,
    providerId: selection.id,
    name: selection.name,
    region: selection.region,
    currency: selection.currency,
    status: 'configured',
    secretEnv: getPaymentProviderSecretEnv(providerId),
    configuredAt: new Date().toISOString(),
  };

  // Credentials are deliberately not retained here. The deployment secret manager
  // owns the credential; the database stores only the non-secret provider reference.
  void validated;
  CONFIGURED_PROVIDERS.set(key, record);
  return { ...record };
}

export async function persistPaymentProviderSettings(record) {
  if (!record?.ownerId) throw new Error('payment_owner_required');
  if (!record?.providerId) throw new Error('payment_provider_required');
  if (!record?.secretEnv) throw new Error('payment_provider_secret_env_required');

  const result = await query(
    `INSERT INTO seller_payment_provider_settings
      (owner_id, provider_id, name, region, currency, status, secret_env, configured_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (owner_id, provider_id)
     DO UPDATE SET
       name = EXCLUDED.name,
       region = EXCLUDED.region,
       currency = EXCLUDED.currency,
       status = EXCLUDED.status,
       secret_env = EXCLUDED.secret_env,
       configured_at = EXCLUDED.configured_at
     RETURNING owner_id, provider_id, name, region, currency, status, secret_env, configured_at`,
    [record.ownerId, record.providerId, record.name, record.region, record.currency,
      record.status, record.secretEnv, record.configuredAt]
  );

  const persisted = mapRecord(result.rows[0]);
  CONFIGURED_PROVIDERS.set(`${persisted.ownerId}:${persisted.providerId}`, persisted);
  return { ...persisted };
}

export function getPaymentProviderSettings(ownerId = null) {
  const records = [...CONFIGURED_PROVIDERS.values()];
  const filtered = ownerId ? records.filter((record) => record.ownerId === ownerId) : records;
  return filtered.map((record) => ({ ...record }));
}

export async function getPersistedPaymentProviderSettings(ownerId = null) {
  if (!process.env.DATABASE_URL) return getPaymentProviderSettings(ownerId);

  const result = await query(
    `SELECT owner_id, provider_id, name, region, currency, status, secret_env, configured_at
       FROM seller_payment_provider_settings
      WHERE ($1::uuid IS NULL OR owner_id = $1::uuid)
      ORDER BY configured_at DESC`,
    [ownerId]
  );
  const records = result.rows.map(mapRecord);
  for (const record of records) {
    CONFIGURED_PROVIDERS.set(`${record.ownerId}:${record.providerId}`, record);
  }
  return records.map((record) => ({ ...record }));
}

export function clearPaymentProviderSettings({ ownerId, providerId } = {}) {
  if (!ownerId) throw new Error('payment_owner_required');
  if (!providerId) throw new Error('payment_provider_required');
  return CONFIGURED_PROVIDERS.delete(`${ownerId}:${providerId}`);
}

export async function deletePersistedPaymentProviderSettings({ ownerId, providerId } = {}) {
  if (!ownerId) throw new Error('payment_owner_required');
  if (!providerId) throw new Error('payment_provider_required');

  const result = await query(
    `DELETE FROM seller_payment_provider_settings
      WHERE owner_id = $1 AND provider_id = $2`,
    [ownerId, providerId]
  );
  CONFIGURED_PROVIDERS.delete(`${ownerId}:${providerId}`);
  return result.rowCount > 0;
}
