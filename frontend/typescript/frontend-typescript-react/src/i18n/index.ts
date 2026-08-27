import { useEffect, useState } from 'react';
import { en } from './en';
import { ru } from './ru';
import type { Dictionary, Lang } from './types';

/** Mirror of `HEADER_LANG_CHANGE` in design-system `js/header.js`. */
export const HEADER_LANG_CHANGE = 'header:lang-change';
/** Mirror of `LANG_STORAGE_KEY` in design-system `js/header.js`. Read-only here. */
export const LANG_STORAGE_KEY = 'zds-lang';

export const dictionaries: Record<Lang, Dictionary> = { en, ru };

export { en } from './en';
export { ru } from './ru';
export type { Dictionary, Lang } from './types';

export function isLang(value: string | null | undefined): value is Lang {
  return value === 'en' || value === 'ru';
}

export function langFromDetail(lang: string | null | undefined): Lang {
  return lang === 'ru' ? 'ru' : 'en';
}

/** Read `zds-lang`. Host i18n never writes storage — `header.js` owns persist. */
export function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) {
      return stored;
    }
  } catch {
    // private mode / blocked storage
  }
  return 'en';
}

export function applyDocumentLang(lang: Lang): void {
  document.documentElement.lang = lang;
}

export function formatCopy(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(vars, key) ? vars[key] : match,
  );
}

export function useI18n(): { lang: Lang; copy: Dictionary } {
  const [lang, setLang] = useState<Lang>(readStoredLang);

  useEffect(() => {
    applyDocumentLang(lang);
  }, [lang]);

  useEffect(() => {
    const onLang = (event: Event) => {
      const detail = (event as CustomEvent<{ lang?: string }>).detail;
      setLang(langFromDetail(detail?.lang));
    };
    document.addEventListener(HEADER_LANG_CHANGE, onLang);
    return () => document.removeEventListener(HEADER_LANG_CHANGE, onLang);
  }, []);

  return { lang, copy: dictionaries[lang] };
}
