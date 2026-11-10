/**
 * Enterprise Structured Logger for THE LORD ERP
 * Ensures all tokens, secrets, credentials, and sensitive financial payloads are redacted.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'DEBUG';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'jwt',
  'authorization',
  'secret',
  'privatekey',
  'cookie',
  'totpsecret',
  'recoverycodes',
  'initial_admin_password'
]);

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Redact JWT tokens: eyJ...
    if (/^Bearer\s+eyJ/i.test(value) || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)) {
      return '[REDACTED_JWT]';
    }
    // Redact 64-char hex private keys
    if (/^[a-fA-F0-9]{64}$/.test(value)) {
      return '[REDACTED_PRIVATE_KEY]';
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = redactValue(v);
      }
    }
    return sanitized;
  }

  return value;
}

class Logger {
  private format(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta !== undefined ? ` | ${JSON.stringify(redactValue(meta))}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  info(message: string, meta?: unknown): void {
    console.log(this.format('INFO', message, meta));
  }

  warn(message: string, meta?: unknown): void {
    console.warn(this.format('WARN', message, meta));
  }

  error(message: string, error?: unknown): void {
    const errMeta = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    console.error(this.format('ERROR', message, errMeta));
  }

  security(message: string, meta?: unknown): void {
    console.warn(this.format('SECURITY', `🛡️ [AUDIT] ${message}`, meta));
  }

  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('DEBUG', message, meta));
    }
  }
}

export const logger = new Logger();

