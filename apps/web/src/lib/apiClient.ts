export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Scrubs any legacy JWT tokens from browser localStorage.
 * Authentication relies exclusively on HttpOnly; Secure; SameSite cookies.
 */
export function clearClientAuthTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lord_auth_token');
  localStorage.removeItem('auth_token');
}

/**
 * Clears all client-side session state (legacy tokens + cached UI profile).
 */
export function clearClientSession(): void {
  if (typeof window === 'undefined') return;
  clearClientAuthTokens();
  localStorage.removeItem('lord_current_user');
}

/**
 * Unified fetch wrapper for the browser UI.
 * Automatically sends HttpOnly session cookies (credentials: 'include')
 * and attaches the X-Requested-With CSRF defense header.
 */
export async function apiFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${API_BASE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;

  const headers = new Headers(init.headers || {});
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  return fetch(url, {
    ...init,
    credentials: 'include',
    headers
  });
}

