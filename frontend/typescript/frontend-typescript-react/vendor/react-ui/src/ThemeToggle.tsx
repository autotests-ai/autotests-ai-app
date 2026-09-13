import { useCallback, useEffect, useState } from 'react';
import { cn } from './cn';
import { ThemeIconMoon, ThemeIconSun } from './theme-icons';

/** Mirror of `HEADER_THEME_CHANGE` in design-system `js/header.js`. */
export const HEADER_THEME_CHANGE = 'header:theme-change';
/** Mirror of `THEME_STORAGE_KEY` in design-system `js/header.js`. */
export const THEME_STORAGE_KEY = 'zds-theme';

export type ThemeCode = 'light' | 'dark';

export interface ThemeToggleProps {
  className?: string;
  testId?: string;
  storageKey?: string;
}

function isTheme(value: string | null | undefined): value is ThemeCode {
  return value === 'light' || value === 'dark';
}

function readTheme(storageKey: string): ThemeCode {
  if (typeof document === 'undefined') {
    return 'dark';
  }
  try {
    const stored = localStorage.getItem(storageKey);
    if (isTheme(stored)) {
      return stored;
    }
  } catch {
    // private mode / blocked storage
  }
  return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
}

function persistTheme(storageKey: string, theme: ThemeCode) {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // private mode / blocked storage
  }
}

function applyTheme(theme: ThemeCode, storageKey: string) {
  document.documentElement.classList.toggle('theme-light', theme === 'light');
  persistTheme(storageKey, theme);
  document.dispatchEvent(new CustomEvent(HEADER_THEME_CHANGE, { detail: { theme } }));
}

export function ThemeToggle({
  className,
  testId = 'header-theme-toggle',
  storageKey = THEME_STORAGE_KEY,
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeCode>(() => readTheme(storageKey));

  useEffect(() => {
    applyTheme(theme, storageKey);
  }, [theme, storageKey]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      className={cn('icon-btn', className)}
      data-testid={testId}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      onClick={toggle}
    >
      <span className="icon" aria-hidden="true">
        {isLight ? <ThemeIconSun /> : <ThemeIconMoon />}
      </span>
    </button>
  );
}
