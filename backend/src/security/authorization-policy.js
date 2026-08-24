const ROLE_PERMISSIONS = Object.freeze({
  buyer: new Set(['catalog:read', 'order:self', 'library:self', 'favorite:self', 'report:create']),
  seller: new Set(['catalog:read', 'product:self', 'order:self', 'library:self', 'payout:self', 'report:create']),
  moderator: new Set(['catalog:read', 'moderation:reports', 'moderation:product', 'audit:read']),
  admin: new Set(['catalog:read', 'moderation:reports', 'moderation:product', 'moderation:user', 'payout:review', 'audit:read']),
});

export function assertPermission({ user, permission }) {
  if (!user) throw new Error('authentication_required');
  const permissions = ROLE_PERMISSIONS[user.role];
  if (!permissions?.has(permission)) throw new Error('forbidden');
  return true;
}

export function assertOwnership({ user, resource, ownerField = 'user_id' }) {
  if (!user || !resource) throw new Error('forbidden');
  if (resource[ownerField] !== user.id) throw new Error('forbidden');
  return true;
}
