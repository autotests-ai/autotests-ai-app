import type { HeaderConfig } from '@zero-design-system/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  envNavItems,
  envOrigins,
  PROD_ORIGIN,
  PUBLIC_HOST,
  productHost,
  STAGE_ORIGIN,
} from '../../vendor/ds/js/env-hosts.js';

// Canonical design-system header from lean runtime (committed; works in
// standalone checkout without monorepo design-system symlink).
const { HEADER_JS, TEMPLATE_HTML } = vi.hoisted(() => {
  const { readFileSync: read } = require('node:fs') as typeof import('node:fs');
  const { resolve: res } = require('node:path') as typeof import('node:path');
  const runtime = res(__dirname, '../../vendor/ds');
  return {
    HEADER_JS: res(runtime, 'js/header.js'),
    TEMPLATE_HTML: read(res(runtime, 'templates/header.html'), 'utf8'),
  };
});

// String literal required — vi.mock is hoisted.
vi.mock('../../vendor/ds/js/dom-utils.js', () => ({
  fetchTemplateText: vi.fn(async () => TEMPLATE_HTML),
  escapeHtml: (v: string) => v,
  copyToClipboard: vi.fn(),
}));

const REFERENCE_HEADER_CONFIG: HeaderConfig = {
  brand: { href: '/', label: 'autotests.ai' },
  nav: [
    { href: '/', label: 'Home', active: false, testid: 'header-nav-home' },
    { href: '/stack/', label: 'Stack', active: false, testid: 'header-nav-stack' },
    ...envNavItems(),
  ],
  lang: { default: 'en' as const },
  theme: { default: 'dark' as const },
};

function navLinks(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-testid="header-nav"] a'));
}

function menuNavLinks(): HTMLAnchorElement[] {
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>('[data-testid="header-menu-nav"] a'),
  );
}

function activeTestids(): (string | undefined)[] {
  return navLinks()
    .filter((a) => a.classList.contains('is-active'))
    .map((a) => a.dataset.testid);
}

function activeMenuTestids(): (string | undefined)[] {
  return menuNavLinks()
    .filter((a) => a.classList.contains('is-active'))
    .map((a) => a.dataset.testid);
}

function ariaCurrentTestids(): (string | undefined)[] {
  return navLinks()
    .filter((a) => a.getAttribute('aria-current') === 'page')
    .map((a) => a.dataset.testid);
}

async function mountAt(path: string): Promise<void> {
  window.history.replaceState({}, '', path);
  document.body.innerHTML = '<div id="app-header"></div>';
  (window as unknown as { headerConfig: unknown }).headerConfig =
    structuredClone(REFERENCE_HEADER_CONFIG);
  vi.resetModules();
  await import(/* @vite-ignore */ HEADER_JS);
  await vi.waitFor(() => {
    expect(navLinks().length).toBe(4);
    expect(menuNavLinks().length).toBe(4);
  });
}

function mockMobileViewport(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width: 767px'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('canonical header.js — active nav follows the route', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    document.documentElement.className = '';
    mockMobileViewport();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('highlights Home on mount root', async () => {
    await mountAt('/');
    expect(activeTestids()).toEqual(['header-nav-home']);
    expect(ariaCurrentTestids()).toEqual(['header-nav-home']);
  });

  it('highlights Stack on the /stack/ board', async () => {
    await mountAt('/stack/');
    expect(activeTestids()).toEqual(['header-nav-stack']);
    expect(ariaCurrentTestids()).toEqual(['header-nav-stack']);
  });

  it('re-syncs on SPA pushState (Home → Stack)', async () => {
    await mountAt('/');
    expect(activeTestids()).toEqual(['header-nav-home']);

    window.history.pushState({}, '', '/stack/');

    await vi.waitFor(() => {
      expect(activeTestids()).toEqual(['header-nav-stack']);
    });
    expect(ariaCurrentTestids()).toEqual(['header-nav-stack']);
  });

  it('re-syncs on popstate (browser back/forward)', async () => {
    await mountAt('/stack/');
    window.history.replaceState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await vi.waitFor(() => {
      expect(activeTestids()).toEqual(['header-nav-home']);
    });
    expect(ariaCurrentTestids()).toEqual(['header-nav-home']);
  });

  it('keeps aria-current on exactly one item after navigation', async () => {
    await mountAt('/');
    window.history.pushState({}, '', '/stack/');
    await vi.waitFor(() => {
      expect(ariaCurrentTestids()).toEqual(['header-nav-stack']);
    });
  });
});

describe('canonical header.js — mobile burger menu', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    document.documentElement.className = '';
    mockMobileViewport();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('builds menu with nav, search, and github links', async () => {
    await mountAt('/');

    expect(document.querySelector('[data-testid="header-menu"]')).not.toBeNull();
    expect(menuNavLinks().map((a) => a.dataset.testid)).toEqual([
      'header-menu-nav-home',
      'header-menu-nav-stack',
      'header-menu-nav-stage',
      'header-menu-nav-prod',
    ]);
    expect(document.querySelector('[data-testid="header-menu-search-input"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="header-menu-github"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="header-menu-github-pages"]')).not.toBeNull();
  });

  it('toggles menu visibility via burger button', async () => {
    await mountAt('/');

    const burger = document.querySelector<HTMLButtonElement>('[data-testid="header-burger"]');
    const menu = document.querySelector<HTMLElement>('[data-testid="header-menu"]');
    expect(burger).not.toBeNull();
    expect(menu).not.toBeNull();
    expect(menu?.hidden).toBe(true);
    expect(burger?.getAttribute('aria-expanded')).toBe('false');

    burger?.click();
    expect(menu?.hidden).toBe(false);
    expect(burger?.getAttribute('aria-expanded')).toBe('true');

    burger?.click();
    expect(menu?.hidden).toBe(true);
    expect(burger?.getAttribute('aria-expanded')).toBe('false');
  });

  it('highlights the active route in menu nav links', async () => {
    await mountAt('/stack/');
    expect(activeMenuTestids()).toEqual(['header-menu-nav-stack']);
  });

  it('closes menu when a menu nav link is clicked', async () => {
    await mountAt('/');

    const burger = document.querySelector<HTMLButtonElement>('[data-testid="header-burger"]');
    const menu = document.querySelector<HTMLElement>('[data-testid="header-menu"]');
    burger?.click();
    expect(menu?.hidden).toBe(false);

    menuNavLinks()[0]?.click();
    expect(menu?.hidden).toBe(true);
  });
});

describe('env-hosts — product public_host', () => {
  it('derives Stage/Prod origins from public_host', () => {
    expect(PROD_ORIGIN).toBe(`https://${PUBLIC_HOST}`);
    expect(STAGE_ORIGIN).toBe(`https://stage.${PUBLIC_HOST}`);
    expect(envNavItems().map((item) => item.testid)).toEqual([
      'header-nav-stage',
      'header-nav-prod',
    ]);
  });

  it('keeps matrix hosts on loopback and follows the current product otherwise', () => {
    expect(productHost('localhost')).toBe(PUBLIC_HOST);
    expect(productHost('127.0.0.1')).toBe(PUBLIC_HOST);
    expect(productHost('autotests.ai')).toBe('autotests.ai');
    expect(productHost('stage.autotests.ai')).toBe('autotests.ai');
    expect(productHost('ai-first.autotests.ai')).toBe('ai-first.autotests.ai');
    expect(productHost('stage.ai-first.autotests.ai')).toBe('ai-first.autotests.ai');
    expect(envOrigins('ai-first.autotests.ai')).toEqual({
      prod: 'https://ai-first.autotests.ai',
      stage: 'https://stage.ai-first.autotests.ai',
    });
    expect(envNavItems('ai-first.autotests.ai').map((item) => item.href)).toEqual([
      'https://stage.ai-first.autotests.ai/',
      'https://ai-first.autotests.ai/',
    ]);
  });
});

describe('canonical header.js — host-match env switchers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    document.documentElement.className = '';
    mockMobileViewport();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps Stage/Prod on env homes without stealing page active', async () => {
    await mountAt('/');

    expect(activeTestids()).toEqual(['header-nav-home']);
    expect(ariaCurrentTestids()).toEqual(['header-nav-home']);

    const stage = document.querySelector<HTMLAnchorElement>('[data-testid="header-nav-stage"]');
    const prod = document.querySelector<HTMLAnchorElement>('[data-testid="header-nav-prod"]');
    expect(stage?.getAttribute('href')).toBe(`${STAGE_ORIGIN}/`);
    expect(prod?.getAttribute('href')).toBe(`${PROD_ORIGIN}/`);
    expect(stage?.classList.contains('is-active')).toBe(false);
    expect(prod?.classList.contains('is-active')).toBe(false);
  });

  it('marks the host-match item active when hostname matches', async () => {
    await mountAt('/');

    const config = structuredClone(REFERENCE_HEADER_CONFIG);
    config.nav = [
      ...(config.nav ?? []).filter((item) => item.match !== 'host'),
      {
        href: `${window.location.origin}/`,
        label: 'Here',
        testid: 'header-nav-here',
        match: 'host' as const,
      },
    ];
    document.body.innerHTML = '<div id="app-header"></div>';
    (window as unknown as { headerConfig: unknown }).headerConfig = config;
    vi.resetModules();
    await import(/* @vite-ignore */ HEADER_JS);
    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="header-nav-here"]')).not.toBeNull();
    });

    const here = document.querySelector<HTMLAnchorElement>('[data-testid="header-nav-here"]');
    expect(here?.classList.contains('is-active')).toBe(true);
    expect(here?.getAttribute('aria-current')).toBe('true');
    expect(activeTestids()).toEqual(['header-nav-home', 'header-nav-here']);
  });

  it('keeps Stage/Prod on env homes after SPA pushState', async () => {
    await mountAt('/');
    window.history.pushState({}, '', '/stack/');

    await vi.waitFor(() => {
      const stage = document.querySelector<HTMLAnchorElement>('[data-testid="header-nav-stage"]');
      expect(stage?.getAttribute('href')).toBe(`${STAGE_ORIGIN}/`);
    });
    expect(activeTestids()).toEqual(['header-nav-stack']);
  });
});
