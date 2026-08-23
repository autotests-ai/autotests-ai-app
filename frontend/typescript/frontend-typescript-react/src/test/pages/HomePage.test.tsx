import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULTS, fingerprint } from '../../lib/landing-config';
import { HomePage } from '../../pages/HomePage';

describe('HomePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
    expect(screen.getByTestId('landing-stack-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-build-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-ci-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-driver-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-remote-panel')).toHaveClass('panel--content');
    expect(screen.getByTestId('landing-console-panel')).toHaveClass('panel--content');
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
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('codeHost: github.com');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'ciRunner: github-hosted',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'backend: backend-java-spring',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'frontend: frontend-typescript-react',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'tests: tests-java-gradle-junit5-allure3-selenide',
    );
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

  it('writes matrix module ids for backend, frontend, and tests into YAML', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'backend' }),
      'backend-kotlin-spring',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'backend: backend-kotlin-spring',
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'frontend' }),
      'frontend-javascript-vue',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'frontend: frontend-javascript-vue',
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'tests' }),
      'tests-javascript-playwright',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'tests: tests-javascript-playwright',
    );
  });

  it('writes GitLab host and Jenkins runner into the terminal YAML', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'codeHost' }), 'gitlab.qa.guru');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'codeHost: gitlab.qa.guru',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'ciRunner: gitlab-self-hosted',
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'ciRunner' }), 'jenkins');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('ciRunner: jenkins');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'codeHost' }),
      'gitlab.com/qa-guru',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'codeHost: "gitlab.com/qa-guru"',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('ciRunner: jenkins');
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
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: true');

    await user.click(screen.getByTestId('landing-terminal-reset'));
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: false');
    expect(screen.getByTestId('landing-terminal-vector')).toHaveTextContent(fingerprint(DEFAULTS));

    await user.click(screen.getByTestId('landing-terminal-copy'));
    expect(writeText).toHaveBeenCalled();
    expect(String(writeText.mock.calls[0]?.[0])).toContain('headless: false');

    await user.click(screen.getByTestId('landing-terminal-download'));
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
  });
});
