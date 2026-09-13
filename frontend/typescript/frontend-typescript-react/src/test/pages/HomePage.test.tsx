import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADER_LANG_CHANGE, ru } from '../../i18n';
import { DEFAULTS, fingerprint } from '../../lib/landing-config';
import { HomePage } from '../../pages/HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('renders the configurator shell and sticky terminal, not an empty page-shell', () => {
    render(<HomePage />);

    const shell = screen.getByTestId('page-shell');
    expect(shell.tagName).toBe('MAIN');
    expect(shell).toHaveClass('configurator', 'page-shell', 'page-shell--below-header-tight');
    expect(shell).not.toBeEmptyDOMElement();

    const layout = screen.getByTestId('landing-configurator');
    expect(layout).toHaveClass(
      'configurator__layout',
      'grid',
      'grid--2x1',
      'configurator__layout--terminal',
    );
    expect(screen.getByTestId('landing-project-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-agents-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-destination-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-build-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-allure-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-driver-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-remote-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-console-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-testops-panel')).toHaveClass('panel--content');
    expect(screen.queryByTestId('landing-git-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('landing-backend-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-project-stack')).toHaveClass(
      'plaque-field-grid-stack',
      'plaque-field-grid-stack--magnet',
    );
    expect(screen.getByTestId('landing-agents-stack')).toHaveClass(
      'plaque-field-grid-stack',
      'plaque-field-grid-stack--magnet',
    );
    expect(screen.getByTestId('landing-destination-stack')).toHaveClass(
      'plaque-field-grid-stack',
      'plaque-field-grid-stack--magnet',
    );
    expect(screen.getByTestId('landing-driver-stack')).toHaveClass(
      'plaque-field-grid-stack',
      'plaque-field-grid-stack--magnet',
    );
    expect(screen.getByTestId('landing-remote-flags')).toHaveClass('plaque-field-grid--pair');
    expect(screen.getByTestId('landing-terminal-panel')).toHaveClass(
      'panel--terminal',
      'panel--sticky',
    );
    expect(screen.getByTestId('landing-terminal-vector')).toHaveTextContent(fingerprint(DEFAULTS));
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('buildOs: linux');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('buildTool: gradle');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'buildWrapper: wrapper',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'allureReportMode: allure3',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'testopsEnabled: false',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: zip');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('coverageProfile:');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'backend: { stack: java-spring, access: write }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cline: { access: write, module: .clinerules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: write, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('codeHost:');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('backendLanguage:');
  });

  it('updates the terminal YAML when a seg is clicked', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    const before = fingerprint(DEFAULTS);
    expect(screen.getByTestId('landing-terminal-vector')).toHaveTextContent(before);

    await user.click(
      within(screen.getByTestId('landing-seg-headless')).getByRole('button', { name: 'true' }),
    );

    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: true');
    expect(screen.getByTestId('landing-terminal-vector')).not.toHaveTextContent(before);
  });

  it('writes build wrapper and Allure / TestOps segs into the terminal YAML', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(
      within(screen.getByTestId('landing-seg-buildWrapper')).getByRole('button', {
        name: 'gradle',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('buildWrapper: system');

    await user.click(
      within(screen.getByTestId('landing-seg-buildTool')).getByRole('button', { name: 'Maven' }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('buildTool: maven');
    expect(
      within(screen.getByTestId('landing-seg-buildWrapper')).getByRole('button', {
        name: './mvnw',
      }),
    ).toBeInTheDocument();

    await user.click(
      within(screen.getByTestId('landing-seg-allureAgentMode')).getByRole('button', {
        name: 'inspect',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'allureAgentMode: inspect',
    );

    await user.click(
      within(screen.getByTestId('landing-seg-testopsEnabled')).getByRole('button', {
        name: 'on',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('testopsEnabled: true');
  });

  it('puts Project, Agents, and Destination above Build and live-updates YAML', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    const project = screen.getByTestId('landing-project-panel');
    const agents = screen.getByTestId('landing-agents-panel');
    const destination = screen.getByTestId('landing-destination-panel');
    const build = screen.getByTestId('landing-build-panel');
    expect(project.compareDocumentPosition(agents) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      agents.compareDocumentPosition(destination) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      destination.compareDocumentPosition(build) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(
      within(screen.getByTestId('landing-seg-cursorAccess')).getByRole('button', {
        name: 'none',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: none, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cline: { access: write, module: .clinerules }',
    );

    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'cloud',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: cloud');
  });

  it('switches YAML/JSON tabs and drives select, text, and tagstrip', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'browser' }), 'firefox');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('browser: firefox');

    await user.clear(screen.getByTestId('landing-field-remoteUrl'));
    await user.type(screen.getByTestId('landing-field-remoteUrl'), 'http://hub:4444/wd/hub');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'remoteUrl: "http://hub:4444/wd/hub"',
    );

    await user.clear(screen.getByTestId('landing-field-name'));
    await user.type(screen.getByTestId('landing-field-name'), 'CI');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('name: CI');

    await user.click(
      within(screen.getByTestId('landing-tagstrip-images')).getByRole('button', {
        name: 'chrome:147',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('chrome:147');
    await user.click(
      within(screen.getByTestId('landing-tagstrip-images')).getByRole('button', {
        name: 'chrome:148',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('chrome:148');

    await user.click(screen.getByRole('tab', { name: 'JSON' }));
    expect(screen.getByRole('tab', { name: 'JSON' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('"browser": "firefox"');
    expect(
      screen.getByTestId('landing-terminal-output').querySelector('.ch-tok-key'),
    ).not.toBeNull();

    await user.click(screen.getByRole('tab', { name: 'YAML' }));
    expect(screen.getByRole('tab', { name: 'YAML' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('browser: firefox');
    expect(screen.queryByRole('tab', { name: 'ci.yml' })).not.toBeInTheDocument();
  });

  it('resets, copies, and downloads the live output', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const createObjectURL = vi.fn(() => 'blob:home');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = createElement(tagName);
      if (tagName === 'a') {
        el.click = click;
      }
      return el;
    });

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-headless')).getByRole('button', { name: 'true' }),
    );
    await user.click(
      within(screen.getByTestId('landing-seg-cursorAccess')).getByRole('button', {
        name: 'none',
      }),
    );
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'user',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: true');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: none, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: user');

    await user.click(screen.getByTestId('landing-terminal-reset'));
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: zip');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cline: { access: write, module: .clinerules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: write, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-terminal-vector')).toHaveTextContent(fingerprint(DEFAULTS));

    await user.click(screen.getByTestId('landing-terminal-copy'));
    expect(writeText).toHaveBeenCalled();
    expect(String(writeText.mock.calls[0]?.[0])).toContain('headless: false');

    await user.click(screen.getByTestId('landing-terminal-download'));
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('translates panel chrome on header:lang-change and keeps option tokens', async () => {
    render(<HomePage />);
    expect(screen.getByTestId('landing-build-title')).toHaveTextContent('Build');
    expect(screen.getByTestId('landing-project-title')).toHaveTextContent('Project');
    expect(screen.getByTestId('landing-driver-title')).toHaveTextContent('Driver');

    act(() => {
      document.dispatchEvent(new CustomEvent(HEADER_LANG_CHANGE, { detail: { lang: 'ru' } }));
    });

    expect(document.documentElement.lang).toBe('ru');
    expect(screen.getByTestId('landing-project-title')).toHaveTextContent(ru.home.panelProject);
    expect(screen.getByTestId('landing-agents-title')).toHaveTextContent(ru.home.panelAgents);
    expect(screen.getByTestId('landing-destination-title')).toHaveTextContent(
      ru.home.panelDestination,
    );
    expect(screen.getByTestId('landing-build-title')).toHaveTextContent(ru.home.panelBuild);
    expect(screen.getByTestId('landing-allure-title')).toHaveTextContent(ru.home.panelAllure);
    expect(screen.getByTestId('landing-driver-title')).toHaveTextContent(ru.home.panelDriver);
    expect(screen.getByTestId('landing-remote-title')).toHaveTextContent(ru.home.panelRemote);
    expect(screen.getByTestId('landing-console-title')).toHaveTextContent(ru.home.panelConsole);
    expect(screen.getByTestId('landing-testops-title')).toHaveTextContent(ru.home.panelTestops);
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: false');
    expect(screen.getByRole('combobox', { name: 'browser' })).toBeInTheDocument();
  });
});
