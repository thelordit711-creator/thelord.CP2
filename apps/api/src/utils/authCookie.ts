import { Response } from 'express';

/**
 * Returns the JWT signing secret or throws immediately if missing.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return secret;
};

/**
 * Computes HttpOnly cookie security options from environment settings.
 */
export const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredSameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  const sameSite: 'strict' | 'lax' | 'none' =
    configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
      ? configuredSameSite
      : isProduction
        ? 'none'
        : 'lax';
  const secure =
    (isProduction && process.env.ALLOW_INSECURE_COOKIES !== 'true') || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  };
};

/**
 * Attaches the HttpOnly JWT session cookie to the response.
 */
export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('auth_token', token, {
    ...getAuthCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

/**
 * Clears session cookies on logout.
 */
export const clearAuthCookie = (res: Response): void => {
  const opts = getAuthCookieOptions();
  res.clearCookie('auth_token', opts);
  res.clearCookie('lord_auth_token', opts);
};

