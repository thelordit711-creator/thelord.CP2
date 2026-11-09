/**
 * Fail-Fast Runtime Environment Validator
 * Ensures all critical security and connection variables exist before server boots.
 */

export interface ValidatedEnv {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  CLIENT_URL: string;
}

export function validateEnvironment(): ValidatedEnv {
  const missing: string[] = [];

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI || MONGODB_URI.trim() === '') {
    missing.push('MONGODB_URI');
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    missing.push('JWT_SECRET');
  } else if (JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('❌ [Security Fatal] JWT_SECRET must be at least 32 characters in production.');
  }

  if (missing.length > 0) {
    const errorMsg = `❌ [Security Fatal] Missing required environment variables:\n${missing.map(m => `   - ${m}`).join('\n')}\nPlease check your .env file or deployment settings. Server boot aborted.`;
    console.error(errorMsg);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }

  return {
    PORT: Number(process.env.PORT) || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: MONGODB_URI!,
    JWT_SECRET: JWT_SECRET!,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000'
  };
}

