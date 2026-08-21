/**
 * TypeScript mirror of the `HeaderConfig` JSDoc typedef in the design-system
 * SSOT (`projects/design-system-home/design-system/js/header.js`). `AppHeader`
 * assigns a value of this shape to `window.headerConfig` before header.js reads
 * it; keep these fields in sync with the vanilla contract.
 */

/** Mirror of `HeaderBrandLeadingConfig` in design-system `js/header.js`. */
export interface HeaderBrandLeadingConfig {
  href?: string;
  label?: string;
}

export interface HeaderBrandConfig {
  href?: string;
  /** Optional text brand (legacy consumers); header.js reads `leading` for the lockup. */
  label?: string;
  /** When set, header.js shows `[data-testid="header-brand-leading"]`. */
  leading?: HeaderBrandLeadingConfig;
}

export interface HeaderNavItem {
  href: string;
  label: string;
  active?: boolean;
  testid?: string;
  /** `host` — env switcher: keep current path, highlight by hostname. Default `path`. */
  match?: 'path' | 'host';
}

export interface HeaderLangConfig {
  default?: 'ru' | 'en';
}

export interface HeaderThemeConfig {
  default?: 'dark' | 'light';
}

export interface HeaderConfig {
  brand?: HeaderBrandConfig;
  nav?: HeaderNavItem[];
  lang?: HeaderLangConfig;
  theme?: HeaderThemeConfig;
}

declare global {
  interface Window {
    headerConfig?: HeaderConfig;
  }
}
