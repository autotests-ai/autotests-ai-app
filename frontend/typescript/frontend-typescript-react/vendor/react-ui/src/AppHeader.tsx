import { useEffect } from 'react';
import type { HeaderConfig } from './header-config';

export interface AppHeaderProps {
  /** Assigned to `window.headerConfig` before header.js mounts the markup. */
  config: HeaderConfig;
  /** Path to the canonical design-system header module (served by the host). */
  scriptSrc?: string;
  /** Id of the mount node header.js targets (`#app-header` by convention). */
  mountId?: string;
}

/**
 * Thin embed wrapper for the canonical design-system header. The header markup,
 * burger menu and nav behaviour stay SSOT in `js/header.js`
 * (`projects/design-system-home/design-system/`) — this component only renders
 * the `#app-header` mount node, publishes `window.headerConfig`, and injects the
 * header module script once. It deliberately does not re-implement the header
 * markup or vendor `header.css`; the host app provides those (via the
 * design-system embed / peer CSS: `tokens.css`, `header.css`, …).
 */
export function AppHeader({
  config,
  scriptSrc = '/js/header.js',
  mountId = 'app-header',
}: AppHeaderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.headerConfig = config;

    if (!document.querySelector('script[data-header-embed]')) {
      const headerScript = document.createElement('script');
      headerScript.type = 'module';
      headerScript.src = scriptSrc;
      headerScript.dataset.headerEmbed = 'true';
      document.body.appendChild(headerScript);
    }
  }, [config, scriptSrc]);

  return <div id={mountId} data-testid="app-header-mount" />;
}
