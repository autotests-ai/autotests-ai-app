import type { HeaderConfig } from '@zero-design-system/react';
import { envNavItems } from '../../vendor/ds/js/env-hosts.js';
import { dictionaries, type Lang } from '../i18n';
import { appPath } from './appBase';

/** Stack matrix board — origin `/stack/`. */
export const STACK_INDEX_HREF = '/stack/';

function navLabelsKey(config: HeaderConfig | undefined): string {
  return (config?.nav ?? []).map((item) => item.label).join('\0');
}

/**
 * Canonical header for the landing SPA. No login/register on apex.
 * Omit `active` — header.js derives it from location.
 * Stage/Prod come from `js/env-hosts.js`.
 * Nav *labels* follow the SPA dictionary; testids and hrefs stay stable.
 */
export function buildHeaderConfig(lang: Lang = 'en'): HeaderConfig {
  const nav = dictionaries[lang].nav;
  return {
    brand: { href: appPath('/'), label: 'autotests.ai' },
    nav: [
      { href: appPath('/'), label: nav.home, testid: 'header-nav-home' },
      { href: STACK_INDEX_HREF, label: nav.stack, testid: 'header-nav-stack' },
      ...envNavItems(),
    ],
    lang: { default: 'en' },
    theme: { default: 'dark' },
  };
}

/**
 * Publish nav labels and remount the canonical header **once** when they change.
 * Theme stays in header.js — this only retitles nav after `header:lang-change`.
 *
 * Compare against `previousKey` (caller ref), not `window.headerConfig`:
 * AppHeader writes the new config in a child effect first, which would
 * otherwise hide the label change and skip remount.
 */
export function syncHeaderNav(config: HeaderConfig, previousKey: string | null): string {
  window.headerConfig = config;
  const next = navLabelsKey(config);
  if (previousKey !== null && previousKey !== next) {
    void window.__designSystemRemountHeader?.();
  }
  return next;
}

/** English snapshot — default lang, used by tests that do not switch language. */
export const headerConfig: HeaderConfig = buildHeaderConfig('en');
