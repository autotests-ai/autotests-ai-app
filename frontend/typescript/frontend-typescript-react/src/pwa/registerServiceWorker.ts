import { APP_BASE } from '../lib/appBase';
import { registerServiceWorker as registerPwa } from './pwa-register.js';

/**
 * Heir wrapper around design-system `js/pwa-register.js` (committed copy).
 * Vite DEV has no real `sw.js` — skip registration. Prod SW lives under the
 * product mount (`/{backend}/frontend-typescript-react/sw.js`).
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) {
    return;
  }
  registerPwa({ immediate: true, swUrl: `${APP_BASE}/sw.js` });
}
