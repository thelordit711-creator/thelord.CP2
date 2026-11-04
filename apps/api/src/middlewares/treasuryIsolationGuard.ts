import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyKindeJWT';

/**
 * Enforces Zero-Access Isolation for Treasury.
 * Treasury cannot view tasks, internal reports, chat, team meetings, or business plans.
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

  const isTreasuryUser = req.user.accessRole === 'TREASURY';
  const path = req.baseUrl || req.path;

  // If a TREASURY user tries to access non-treasury routes (tasks, chat, admin, AI)
  if (isTreasuryUser) {
    const allowedPrefixes = ['/api/v1/treasury', '/api/v1/users/me'];
    const isAllowed = allowedPrefixes.some(prefix => path.startsWith(prefix));

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        error: 'Zero-Access Isolation: Treasury accounts are strictly restricted to the Payout Desk.'
      });
      return;
    }
  }

  next();
};

