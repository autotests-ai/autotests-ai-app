import { useCallback, useEffect, useState } from 'react';
import { cn } from './cn';
import { ThemeIconMoon, ThemeIconSun } from './theme-icons';

export interface ThemeToggleProps {
  className?: string;
  testId?: string;
  storageKey?: string;
}

function readTheme(storageKey: string): 'light' | 'dark' {
  if (typeof document === 'undefined') {
    return 'dark';
  }
  const stored = localStorage.getItem(storageKey);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('theme-light', theme === 'light');
}

export function ThemeToggle({
  className,
  testId = 'header-theme-toggle',
  storageKey = 'zds-theme',
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readTheme(storageKey));

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(storageKey, theme);
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
