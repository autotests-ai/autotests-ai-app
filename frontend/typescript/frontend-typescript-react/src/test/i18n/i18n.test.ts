import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyDocumentLang,
  formatCopy,
  HEADER_LANG_CHANGE,
  isLang,
  LANG_STORAGE_KEY,
  langFromDetail,
  readStoredLang,
} from '../../i18n';

describe('i18n helpers', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('defaults to en and only accepts en|ru', () => {
    expect(readStoredLang()).toBe('en');
    expect(isLang('en')).toBe(true);
    expect(isLang('ru')).toBe(true);
    expect(isLang('de')).toBe(false);
    expect(isLang(null)).toBe(false);
    expect(langFromDetail('ru')).toBe('ru');
    expect(langFromDetail('en')).toBe('en');
    expect(langFromDetail('de')).toBe('en');
    expect(langFromDetail(undefined)).toBe('en');
  });

  it('reads zds-lang from storage', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'ru');
    expect(readStoredLang()).toBe('ru');
    localStorage.setItem(LANG_STORAGE_KEY, 'fr');
    expect(readStoredLang()).toBe('en');
  });

  it('falls back to en when localStorage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(readStoredLang()).toBe('en');
    getItem.mockRestore();
  });

  it('applies html[lang] and keeps the event name aligned with header.js', () => {
    applyDocumentLang('ru');
    expect(document.documentElement.lang).toBe('ru');
    applyDocumentLang('en');
    expect(document.documentElement.lang).toBe('en');
    expect(HEADER_LANG_CHANGE).toBe('header:lang-change');
  });

  it('fills {placeholders} and leaves unknown tokens', () => {
    expect(formatCopy('load {message}', { message: 'HTTP 404' })).toBe('load HTTP 404');
    expect(formatCopy('GitHub {id}', { id: 'backend-java-spring' })).toBe(
      'GitHub backend-java-spring',
    );
    expect(formatCopy('keep {missing}', {})).toBe('keep {missing}');
  });
});
