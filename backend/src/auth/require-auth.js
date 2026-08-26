export function requireAuth(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
  }

  return next();
}
