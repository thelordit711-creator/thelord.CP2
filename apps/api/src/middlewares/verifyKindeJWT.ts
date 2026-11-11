import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { User } from '../models/User.model';
import { IUser } from '@lord/shared-types';
import { treasuryIsolationGuard } from './treasuryIsolationGuard';

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
    let token: string | undefined;

    // 1. Extract from HttpOnly Secure Cookie if present
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    // 2. Fallback to Authorization Header (Bearer token)
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول أولاً' });
      return;
    }

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
            treasuryIsolationGuard(req, res, next);
            return;
          }
        }
      } catch (_err) {
        // Not an HS256 direct token, try RS256
      }
    }

    // 2. Kinde RS256 token verification
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
          treasuryIsolationGuard(req, res, next);
          return;
        }

        next();
      }
    );
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication internal error' });
  }
};
