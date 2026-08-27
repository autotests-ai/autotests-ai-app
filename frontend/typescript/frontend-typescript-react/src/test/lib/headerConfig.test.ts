import { afterEach, describe, expect, it, vi } from 'vitest';
import { ru } from '../../i18n';
import {
  buildHeaderConfig,
  headerConfig,
  STACK_INDEX_HREF,
  syncHeaderNav,
} from '../../lib/headerConfig';

describe('buildHeaderConfig', () => {
  it('keeps testids and hrefs stable across en/ru and only changes labels', () => {
    const enCfg = buildHeaderConfig('en');
    const ruCfg = buildHeaderConfig('ru');
    const enNav = enCfg.nav ?? [];
    const ruNav = ruCfg.nav ?? [];

    expect(enNav.map((item) => item.testid)).toEqual(ruNav.map((item) => item.testid));
    expect(enNav.map((item) => item.href)).toEqual(ruNav.map((item) => item.href));
    expect(enNav.find((item) => item.testid === 'header-nav-home')?.label).toBe('Home');
    expect(ruNav.find((item) => item.testid === 'header-nav-home')?.label).toBe(ru.nav.home);
    expect(enNav.find((item) => item.testid === 'header-nav-stack')?.label).toBe('Stack');
    expect(ruNav.find((item) => item.testid === 'header-nav-stack')?.label).toBe(ru.nav.stack);
    expect(enNav.find((item) => item.testid === 'header-nav-stack')?.href).toBe(STACK_INDEX_HREF);
    expect(headerConfig.lang?.default).toBe('en');
    expect(headerConfig.theme?.default).toBe('dark');
  });
});

describe('syncHeaderNav', () => {
  afterEach(() => {
    delete window.headerConfig;
    delete window.__designSystemRemountHeader;
  });

  it('does not remount when labels are unchanged or remount is missing', () => {
    const remount = vi.fn();
    window.__designSystemRemountHeader = remount;
    let key: string | null = null;
    key = syncHeaderNav(buildHeaderConfig('en'), key);
    expect(remount).not.toHaveBeenCalled();

    key = syncHeaderNav(buildHeaderConfig('en'), key);
    expect(remount).not.toHaveBeenCalled();

    delete window.__designSystemRemountHeader;
    syncHeaderNav(buildHeaderConfig('ru'), key);
    expect(window.headerConfig?.nav?.[0]?.label).toBe(ru.nav.home);

    window.__designSystemRemountHeader = remount;
    syncHeaderNav({ brand: { label: 'autotests.ai' } }, 'Home');
    expect(remount).toHaveBeenCalledTimes(1);
  });

  it('remounts the header once when nav labels change', () => {
    const remount = vi.fn().mockResolvedValue(undefined);
    window.__designSystemRemountHeader = remount;
    let key: string | null = null;
    key = syncHeaderNav(buildHeaderConfig('en'), key);

    key = syncHeaderNav(buildHeaderConfig('ru'), key);
    expect(remount).toHaveBeenCalledTimes(1);

    key = syncHeaderNav(buildHeaderConfig('ru'), key);
    expect(remount).toHaveBeenCalledTimes(1);

    syncHeaderNav(buildHeaderConfig('en'), key);
    expect(remount).toHaveBeenCalledTimes(2);
  });
});
