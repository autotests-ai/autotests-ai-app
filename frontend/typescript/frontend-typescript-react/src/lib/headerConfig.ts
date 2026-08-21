import type { HeaderConfig } from '@zero-design-system/react';
import { envNavItems } from '../../vendor/ds/js/env-hosts.js';
import { appPath } from './appBase';

/** Stack matrix board — origin `/stack/` (phase 2). May 404 in this scaffold. */
export const STACK_INDEX_HREF = '/stack/';

/**
 * Canonical header for the landing SPA. No login/register on apex.
 * Omit `active` — header.js derives it from location.
 * Stage/Prod come from `js/env-hosts.js`.
 */
export const headerConfig: HeaderConfig = {
  brand: { href: appPath('/'), label: 'autotests.ai' },
  nav: [
    { href: appPath('/'), label: 'Home', testid: 'header-nav-home' },
    { href: STACK_INDEX_HREF, label: 'Stack', testid: 'header-nav-stack' },
    ...envNavItems(),
  ],
  lang: { default: 'en' },
  theme: { default: 'dark' },
};
