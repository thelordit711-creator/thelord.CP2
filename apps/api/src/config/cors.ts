/**
 * Centralized CORS & Origin Security Validator
 * Validates allowed origins for both Express HTTP endpoints and Socket.io engine.
 */

export function getAllowedOrigins(): string[] {
  const origins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];

  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL.trim());
  }

  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL.trim());
  }

  if (process.env.ALLOWED_ORIGINS) {
    const list = process.env.ALLOWED_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(Boolean);
    origins.push(...list);
  }

  return Array.from(new Set(origins));
}

export function isOriginAllowed(origin?: string): boolean {
  // Allow requests with no origin (mobile apps, desktop Electron, cURL, server-to-server)
  if (!origin) return true;

  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return true;

  // In non-production, allow localhost and loopback on any port
  if (process.env.NODE_ENV !== 'production') {
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return true;
    }
  }

  return false;
}
