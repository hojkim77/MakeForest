import { Request, Response, NextFunction } from 'express';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * All mutating routes (sessions, harvest) must come through the Next.js API layer,
 * which validates the user session and forwards requests with this header.
 * In dev, the secret is optional — skip validation if not set.
 */
export function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
  if (!INTERNAL_SECRET) return next(); // dev: secret not configured, pass through

  if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
