import { useCallback, useEffect, useState } from 'react';
import { cn } from './cn';

export type LangCode = 'en' | 'ru';

/** Mirror of `HEADER_LANG_CHANGE` in design-system `js/header.js`. */
export const HEADER_LANG_CHANGE = 'header:lang-change';
/** Mirror of `LANG_STORAGE_KEY` in design-system `js/header.js`. */
export const LANG_STORAGE_KEY = 'zds-lang';

export interface LangToggleProps {
  className?: string;
  testId?: string;
  labelTestId?: string;
  defaultLang?: LangCode;
  storageKey?: string;
  onLangChange?: (lang: LangCode) => void;
}

function langLabel(code: LangCode): string {
  return code === 'ru' ? 'RU' : 'EN';
}

function langAriaLabel(code: LangCode): string {
  return code === 'ru' ? 'Переключить на English' : 'Switch to Russian';
}

function isLang(value: string | null | undefined): value is LangCode {
  return value === 'en' || value === 'ru';
}

function readLang(storageKey: string, fallback: LangCode): LangCode {
  if (typeof document === 'undefined') {
    return fallback;
  }
  try {
    const stored = localStorage.getItem(storageKey);
    if (isLang(stored)) {
      return stored;
    }
  } catch {
    // private mode / blocked storage
  }
  return fallback;
}

function persistLang(storageKey: string, lang: LangCode) {
  try {
    localStorage.setItem(storageKey, lang);
  } catch {
    // private mode / blocked storage
  }
}

function applyLang(lang: LangCode, storageKey: string) {
  document.documentElement.lang = lang;
  persistLang(storageKey, lang);
  document.dispatchEvent(new CustomEvent(HEADER_LANG_CHANGE, { detail: { lang } }));
}

export function LangIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function LangToggle({
  className,
  testId = 'header-lang-toggle',
  labelTestId = 'header-lang-label',
  defaultLang = 'en',
  storageKey = LANG_STORAGE_KEY,
  onLangChange,
}: LangToggleProps) {
  const [lang, setLang] = useState<LangCode>(() => readLang(storageKey, defaultLang));

  useEffect(() => {
    applyLang(lang, storageKey);
  }, [lang, storageKey]);

  const toggle = useCallback(() => {
    const next: LangCode = lang === 'ru' ? 'en' : 'ru';
    setLang(next);
    onLangChange?.(next);
  }, [lang, onLangChange]);

  return (
    <span className={cn('lang-toggle', className)}>
      <button
        type="button"
        className="icon-btn"
        data-testid={testId}
        data-lang={lang}
        aria-label={langAriaLabel(lang)}
        onClick={toggle}
      >
        <span className="icon" aria-hidden="true">
          <LangIcon />
        </span>
      </button>
      <span className="lang-toggle__label" data-testid={labelTestId} aria-hidden="true">
        {langLabel(lang)}
      </span>
    </span>
  );
}
