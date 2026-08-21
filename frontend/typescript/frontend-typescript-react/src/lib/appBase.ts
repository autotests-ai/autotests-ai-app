/** Apex SPA — document root. Not a nested matrix mount (`./` + pinMount). */

export const APP_BASE = '';
export const API_BASE = '/api';

/**
 * Prefix a same-origin path with the product mount (apex: identity).
 * `appPath('/')` → `/`
 * `appPath('/js/header.js')` → `/js/header.js`
 */
export function appPath(path: string = '/'): string {
  let p = path == null || path === '' ? '/' : String(path);
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  return `${APP_BASE}${p}`;
}

/** Build API URL: `apiUrl('/health')` → `/api/health`. */
export function apiUrl(path: string): string {
  let p = path == null || path === '' ? '' : String(path);
  if (p !== '' && !p.startsWith('/')) {
    p = `/${p}`;
  }
  if (p.startsWith('/api/')) {
    p = p.slice(4);
  } else if (p === '/api') {
    p = '';
  }
  return `${API_BASE}${p}`;
}
