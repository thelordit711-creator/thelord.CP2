import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyKindeJWT';
import { AccessRole, AppPermission, hasPermission } from '@lord/shared-types';
import { logger } from '../utils/logger';

/**
 * RBAC Role Guard
 * Restricts endpoint to specific roles.
 */
export const rbacGuard = (allowedRoles: AccessRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'غير مصرح: يرجى تسجيل الدخول أولاً' 
      });
      return;
    }

    if (!allowedRoles.includes(req.user.accessRole)) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      logger.security(`Unauthorized RBAC access attempt`, {
        userId: req.user._id,
        role: req.user.accessRole,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        ip: clientIp
      });

      res.status(403).json({ 
        success: false, 
        error: `غير مصرح لك بالوصول لهذا المسار. هذه العملية مقتصرة على: [${allowedRoles.join(', ')}]` 
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based Guard
 * Uses Central Permission Matrix from @lord/shared-types.
 */
export const requirePermission = (permission: AppPermission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'غير مصرح: يرجى تسجيل الدخول أولاً' 
      });
      return;
    }

    if (!hasPermission(req.user.accessRole, permission)) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      logger.security(`Permission denied`, {
        userId: req.user._id,
        role: req.user.accessRole,
        requiredPermission: permission,
        url: req.originalUrl,
        ip: clientIp
      });

      res.status(403).json({ 
        success: false, 
        error: `غير مصرح: حسابك لا يمتلك الصلاحية المطلوبة (${permission})` 
      });
      return;
    }

    next();
  };
};
