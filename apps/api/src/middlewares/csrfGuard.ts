import { Request, Response, NextFunction } from 'express';
import { isOriginAllowed } from '../config/cors';
import { logger } from '../utils/logger';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface CsrfValidationInput {
  method: string;
  hasCookieToken: boolean;
  hasBearerToken: boolean;
  origin?: string;
  referer?: string;
  xRequestedWith?: string;
  contentType?: string;
}

/**
 * Pure deterministic CSRF validator for cookie-authenticated mutations.
 * Blocks cross-site form submissions and untrusted origins while permitting
 * explicit Bearer API clients and verified first-party XMLHttpRequest/JSON calls.
 */
export function validateCsrfRequest(input: CsrfValidationInput): { valid: boolean; reason?: string } {
  if (SAFE_METHODS.has(input.method.toUpperCase())) {
    return { valid: true };
  }

  // Requests without session cookies or authenticated via explicit Authorization Bearer header
  // are not vulnerable to ambient browser cookie CSRF.
  if (!input.hasCookieToken || input.hasBearerToken) {
    return { valid: true };
  }

  let requestOrigin = input.origin?.trim();
  if (!requestOrigin && input.referer) {
    try {
      requestOrigin = new URL(input.referer).origin;
    } catch {
      return { valid: false, reason: 'Invalid Referer header on cookie-authenticated mutation' };
    }
  }

  if (!requestOrigin || !isOriginAllowed(requestOrigin)) {
    return { valid: false, reason: 'Blocked cross-site mutation from untrusted or missing Origin' };
  }

  const isXhr = input.xRequestedWith?.toLowerCase() === 'xmlhttprequest';
  const isJson = input.contentType?.toLowerCase().includes('application/json') ?? false;
  if (!isXhr && !isJson) {
    return {
      valid: false,
      reason: 'Missing custom X-Requested-With or application/json header for cookie-authenticated mutation'
    };
  }

  return { valid: true };
}

/**
 * Express middleware enforcing CSRF defense on cookie-authenticated mutating requests.
 */
export const csrfGuard = (req: Request, res: Response, next: NextFunction): void => {
  const hasCookieToken = Boolean(req.cookies?.auth_token || req.cookies?.lord_auth_token);
  const authHeader = req.headers.authorization;
  const hasBearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

  const result = validateCsrfRequest({
    method: req.method,
    hasCookieToken,
    hasBearerToken,
    origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
    referer: typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
    xRequestedWith:
      typeof req.headers['x-requested-with'] === 'string' ? req.headers['x-requested-with'] : undefined,
    contentType: typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : undefined
  });

  if (!result.valid) {
    logger.security('[CSRF] Blocked mutating request', {
      method: req.method,
      path: req.originalUrl,
      origin: req.headers.origin,
      ip: req.ip,
      reason: result.reason
    });
    res.status(403).json({
      success: false,
      error: 'CSRF security check failed: untrusted cross-site request rejected'
    });
    return;
  }

  next();
};

