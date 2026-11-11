import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyKindeJWT';
import { logger } from '../utils/logger';

/**
 * Pure check for whether an API path is permitted for TREASURY accounts.
 * TREASURY is strictly isolated from tasks, chat, meetings, AI, and projects.
 */
export function isTreasuryPathAllowed(path: string): boolean {
  const cleanPath = (path || '').split('?')[0].toLowerCase();

  const allowedPrefixes = [
    '/api/v1/treasury',
    '/api/v1/finance',
    '/api/v1/upload',
    '/api/v1/notifications',
    '/api/v1/auth',
    '/api/v1/users/me',
    '/api/v1/users/team',
    '/api/v1/users/profile'
  ];

  return allowedPrefixes.some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`));
}

/**
 * Enforces Zero-Access Isolation for Treasury.
 * Treasury cannot view tasks, internal reports, chat, team meetings, AI, or business plans.
 */
export const treasuryIsolationGuard = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  if (req.user.accessRole === 'TREASURY') {
    const fullPath = req.originalUrl || `${req.baseUrl}${req.path}`;
    if (!isTreasuryPathAllowed(fullPath)) {
      logger.security(`[Treasury Isolation] Blocked TREASURY account ${req.user.email} from accessing ${fullPath}`, {
        userId: String(req.user._id),
        ip: req.ip
      });
      res.status(403).json({
        success: false,
        error: 'Zero-Access Isolation: Treasury accounts are strictly restricted to the Payout Desk.'
      });
      return;
    }
  }

  next();
};
