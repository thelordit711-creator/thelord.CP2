import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyKindeJWT';
import { AccessRole } from '@lord/shared-types';

export const rbacGuard = (allowedRoles: AccessRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'User not authenticated or onboarding incomplete' 
      });
      return;
    }

    if (!allowedRoles.includes(req.user.accessRole)) {
      res.status(403).json({ 
        success: false, 
        error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]` 
      });
      return;
    }

    next();
  };
};

