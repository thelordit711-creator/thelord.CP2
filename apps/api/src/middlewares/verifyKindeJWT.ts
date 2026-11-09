import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { User } from '../models/User.model';
import { IUser } from '@lord/shared-types';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  kindeUser?: {
    id: string;
    email?: string;
    given_name?: string;
    family_name?: string;
  };
}

const client = jwksClient({
  jwksUri: `${process.env.KINDE_ISSUER_URL || 'https://thelordofcrypto.kinde.com'}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) {
    callback(new Error('No kid in token header'));
    return;
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export const verifyKindeJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Dev mock user support
      if (process.env.NODE_ENV === 'development' && req.headers['x-mock-user-id']) {
        const mockUser = await User.findById(req.headers['x-mock-user-id']);
        if (mockUser) {
          req.user = (mockUser.toObject() as unknown) as IUser;
          next();
          return;
        }
      }
      res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول أولاً' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 1. Check direct JWT token (HS256)
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      try {
        const directDecoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
        if (directDecoded && directDecoded.userId) {
          const directUser = await User.findById(directDecoded.userId);
          if (directUser) {
            if (directUser.isSuspended) {
              const reasonText = directUser.suspensionReason ? ` السبب: ${directUser.suspensionReason}` : '';
              res.status(403).json({
                success: false,
                error: `تم إيقاف حسابك ومنعك من دخول المنظومة بقرار إداري.${reasonText}`
              });
              return;
            }
            req.user = (directUser.toObject() as unknown) as IUser;
            next();
            return;
          }
        }
      } catch (_err) {
        // Not an HS256 direct token, try other methods
      }
    }

    // 2. Dev token bypass for offline/testing DX
    if (process.env.NODE_ENV === 'development' && token.startsWith('dev_token_')) {
      const parts = token.split('_');
      const targetRole = parts[2]?.toUpperCase();
      let user = null;
      if (targetRole === 'TREASURY') {
        user = await User.findOne({ accessRole: 'TREASURY' });
      } else if (targetRole === 'EMPLOYEE') {
        user = await User.findOne({ accessRole: 'EMPLOYEE' });
      } else {
        user = await User.findOne({ accessRole: 'SUPER_ADMIN' });
      }

      if (!user) {
        user = await User.findOne({});
      }

      if (user) {
        req.user = (user.toObject() as unknown) as IUser;
        next();
        return;
      }
    }

    // 3. Kinde RS256 token verification
    jwt.verify(
      token,
      getKey,
      {
        issuer: process.env.KINDE_ISSUER_URL,
        algorithms: ['RS256']
      },
      async (err, decoded) => {
        if (err || !decoded) {
          res.status(401).json({ success: false, error: 'رمز الجلسة غير صالح أو منتهي الصلاحية' });
          return;
        }

        const payload = decoded as jwt.JwtPayload;
        const kindeId = payload.sub || payload.id;

        req.kindeUser = {
          id: kindeId,
          email: payload.email,
          given_name: payload.given_name,
          family_name: payload.family_name
        };

        const existingUser = await User.findOne({ 
          $or: [{ kindeId }, { email: payload.email }] 
        });
        
        if (existingUser) {
          if (existingUser.isSuspended) {
            const reasonText = existingUser.suspensionReason ? ` السبب: ${existingUser.suspensionReason}` : '';
            res.status(403).json({
              success: false,
              error: `تم إيقاف حسابك ومنعك من دخول المنظومة بقرار إداري.${reasonText}`
            });
            return;
          }
          req.user = (existingUser.toObject() as unknown) as IUser;
        }

        next();
      }
    );
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication internal error' });
  }
};
