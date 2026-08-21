import { useCallback, useState } from 'react';
import { cn } from './cn';

export type LangCode = 'en' | 'ru';

export interface LangToggleProps {
  className?: string;
  testId?: string;
  labelTestId?: string;
  defaultLang?: LangCode;
  onLangChange?: (lang: LangCode) => void;
}

function langLabel(code: LangCode): string {
  return code === 'ru' ? 'RU' : 'EN';
}

function langAriaLabel(code: LangCode): string {
  return code === 'ru' ? 'Переключить на English' : 'Switch to Russian';
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
  onLangChange,
}: LangToggleProps) {
  const [lang, setLang] = useState<LangCode>(defaultLang);

  const toggle = useCallback(() => {
    setLang((current) => {
      const next: LangCode = current === 'ru' ? 'en' : 'ru';
      onLangChange?.(next);
      return next;
    });
  }, [onLangChange]);

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
