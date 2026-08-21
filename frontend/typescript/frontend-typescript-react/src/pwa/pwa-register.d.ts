export const DEFAULT_SW_URL: string;
export const PWA_ICON_PATHS: readonly string[];
export const PWA_SW_CONTRACT: Readonly<{
  registerType: 'autoUpdate';
  skipWaiting: true;
  clientsClaim: true;
  cleanupOutdatedCaches: true;
  navigateFallback: 'index.html';
}>;

export function registerServiceWorker(options?: {
  swUrl?: string;
  immediate?: boolean;
  reloadOnControllerChange?: boolean;
  onRegistered?: (reg: ServiceWorkerRegistration) => void;
  onRegisterError?: (err: unknown) => void;
}): void;
