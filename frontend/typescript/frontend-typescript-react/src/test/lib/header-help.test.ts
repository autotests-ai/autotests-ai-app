import { afterEach, describe, expect, it, vi } from 'vitest';
import { en, ru } from '../../i18n';
import { bindHeaderHelp, HEADER_HELP_TESTID, helpInfoItems } from '../../lib/header-help';

const FORBIDDEN = /mill\.yml|\bADR\b|Box2|\bPAT\b|overlay|009/i;

const EN_TITLES = [
  en.home.panelProject,
  en.home.panelAgents,
  en.home.millProtect,
  en.home.panelImport,
  en.home.panelDestination,
  en.home.cloneCourse,
  en.home.panelBuild,
  en.home.panelAllure,
  en.home.panelDriver,
  en.home.panelRemote,
  en.home.panelConsole,
  en.home.panelTestops,
  en.home.outputFormat,
];

const RU_TITLES = [
  ru.home.panelProject,
  ru.home.panelAgents,
  ru.home.millProtect,
  ru.home.panelImport,
  ru.home.panelDestination,
  ru.home.cloneCourse,
  ru.home.panelBuild,
  ru.home.panelAllure,
  ru.home.panelDriver,
  ru.home.panelRemote,
  ru.home.panelConsole,
  ru.home.panelTestops,
  ru.home.outputFormat,
];

describe('header-help', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lists Project through Output with human bodies, not mill.yml or ADR', () => {
    const items = helpInfoItems(en);
    expect(items.map((item) => item.title)).toEqual(EN_TITLES);
    const blob = items.map((item) => `${item.title} ${item.body}`).join('\n');
    expect(blob).not.toMatch(FORBIDDEN);
    expect(`${en.home.helpAria} ${en.home.helpTitle}`).not.toMatch(FORBIDDEN);
    expect(helpInfoItems(ru).map((item) => item.title)).toEqual(RU_TITLES);
    expect(
      helpInfoItems(ru)
        .map((item) => item.body)
        .join('\n'),
    ).not.toMatch(FORBIDDEN);
  });

  it('uses en aria-label and first title when header-tools is already mounted', () => {
    document.body.innerHTML = '<div data-testid="header-tools"></div>';
    const dispose = bindHeaderHelp(en);
    const trigger = document.querySelector(`[data-testid="${HEADER_HELP_TESTID}-btn"]`);
    expect(trigger).toHaveAttribute('aria-label', en.home.helpAria);
    expect(document.querySelector('.help-info__heading')?.textContent).toBe(en.home.helpTitle);
    expect(document.querySelector('.help-info__title')?.textContent).toBe(en.home.panelProject);
    dispose();
    expect(document.querySelector(`[data-testid="${HEADER_HELP_TESTID}"]`)).toBeNull();
  });

  it('follows ru copy for aria-label and first title', () => {
    document.body.innerHTML = '<div data-testid="header-tools"></div>';
    const dispose = bindHeaderHelp(ru);
    const trigger = document.querySelector(`[data-testid="${HEADER_HELP_TESTID}-btn"]`);
    expect(trigger).toHaveAttribute('aria-label', ru.home.helpAria);
    expect(document.querySelector('.help-info__title')?.textContent).toBe(ru.home.panelProject);
    dispose();
  });

  it('waits for header-tools then binds', async () => {
    const dispose = bindHeaderHelp(en);
    expect(document.querySelector(`[data-testid="${HEADER_HELP_TESTID}"]`)).toBeNull();
    const tools = document.createElement('div');
    tools.setAttribute('data-testid', 'header-tools');
    document.body.append(tools);
    await vi.waitFor(() => {
      expect(document.querySelector(`[data-testid="${HEADER_HELP_TESTID}"]`)).toBeTruthy();
    });
    dispose();
  });

  it('re-attaches after header-tools is replaced', async () => {
    document.body.innerHTML = '<div data-testid="header-tools"></div>';
    const dispose = bindHeaderHelp(en);
    expect(document.querySelector(`[data-testid="${HEADER_HELP_TESTID}"]`)).toBeTruthy();
    document.body.innerHTML = '<div data-testid="header-tools"></div>';
    await vi.waitFor(() => {
      expect(document.querySelector(`[data-testid="${HEADER_HELP_TESTID}"]`)).toBeTruthy();
    });
    dispose();
  });
});
