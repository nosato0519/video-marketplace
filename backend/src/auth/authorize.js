export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'authentication_required' });
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

export function requireOwner(getOwnerId) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'authentication_required' });

    const ownerId = await getOwnerId(req);
    if (!ownerId || ownerId !== user.id) {
      return res.status(404).json({ error: 'not_found' });
    }
    next();
  };
}
