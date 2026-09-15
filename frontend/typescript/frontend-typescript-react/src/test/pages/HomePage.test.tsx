import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADER_LANG_CHANGE, ru } from '../../i18n';
import { githubOAuthAssign, writeGithubUserSession } from '../../lib/github-oauth';
import { idpAssign, idpGate, writeIdpSession } from '../../lib/idp-login';
import {
  assembleApiUrl,
  cloneApiUrl,
  DEFAULTS,
  fingerprint,
  TAKEAWAY_TESTS_STACK,
} from '../../lib/landing-config';
import { AxisField, HomePage } from '../../pages/HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('renders AxisField as a select when there are more than two options', () => {
    const onChange = vi.fn();
    render(
      <AxisField
        label="lang"
        paramId="lang"
        value="21"
        options={[
          { value: '17', label: '17' },
          { value: '21', label: '21' },
          { value: '25', label: '25' },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId('landing-select-lang')).toBeInTheDocument();
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
    expect(screen.getByTestId('landing-import-panel')).toHaveClass('panel--content');
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
    expect(screen.getByRole('combobox', { name: 'backend' })).toHaveValue('java-spring');
    expect(screen.getByRole('combobox', { name: 'frontend' })).toHaveValue('typescript-react');
    expect(screen.getByRole('combobox', { name: 'tests' })).toHaveValue(
      'java-junit5-rest_assured-selenide',
    );
    expect(screen.getByRole('combobox', { name: 'load' })).toHaveValue('slot');
    expect(screen.getByTestId('landing-select-load').closest('.plaque-field-grid')).toHaveClass(
      'plaque-field-grid--duo',
    );
    expect(screen.queryByRole('combobox', { name: 'frontend.module' })).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-agents-stack')).toHaveClass(
      'plaque-field-grid-stack',
      'plaque-field-grid-stack--magnet',
    );
    expect(screen.getByTestId('landing-import-stack')).toHaveClass(
      'plaque-field-grid-stack',
      'plaque-field-grid-stack--magnet',
    );
    expect(screen.getByTestId('landing-import-source')).toHaveClass('plaque-field-grid--duo');
    expect(screen.getByTestId('landing-import-zip-icon')).toBeInTheDocument();
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
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('importUrl');
    expect(screen.queryByPlaceholderText(/pat/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('coverageProfile:');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'backend: { stack: java-spring, access: write }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'load: { access: none, stack: slot, module: "" }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cline: { access: write, module: .clinerules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: write, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-seg-mill')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('landing-seg-mill')).getByRole('button', { name: 'false' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('mill:');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('crystal');
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
    const imported = screen.getByTestId('landing-import-panel');
    const destination = screen.getByTestId('landing-destination-panel');
    const build = screen.getByTestId('landing-build-panel');
    expect(project.compareDocumentPosition(agents) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      agents.compareDocumentPosition(imported) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      imported.compareDocumentPosition(destination) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      destination.compareDocumentPosition(build) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(
      within(screen.getByTestId('landing-tagstrip-agents')).getByRole('button', {
        name: 'cursor',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: none, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cline: { access: write, module: .clinerules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'claude: { access: none, module: .claude }',
    );

    await user.click(
      within(screen.getByTestId('landing-tagstrip-agents')).getByRole('button', {
        name: 'claude',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'claude: { access: write, module: .claude }',
    );

    await user.click(
      within(screen.getByTestId('landing-seg-mill')).getByRole('button', {
        name: 'true',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'mill: { access: write, pack: pack-v1, generation: generation-v1 }',
    );
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('crystal');

    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'cloud',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: cloud');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('org: autotests-cloud');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('via: idp');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('catalog:');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('login:');
    expect(screen.queryByTestId('landing-catalog-href')).not.toBeInTheDocument();
    expect(screen.queryByTestId('landing-user-oauth')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-cloud-idp')).toHaveAttribute(
      'aria-label',
      'Continue with school IdP',
    );
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
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-headless')).getByRole('button', { name: 'true' }),
    );
    await user.click(
      within(screen.getByTestId('landing-tagstrip-agents')).getByRole('button', {
        name: 'cursor',
      }),
    );
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'user',
      }),
    );
    await user.click(
      within(screen.getByTestId('landing-seg-mill')).getByRole('button', { name: 'true' }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: true');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: none, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: user');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'mill: { access: write, pack: pack-v1, generation: generation-v1 }',
    );

    await user.click(screen.getByTestId('landing-terminal-reset'));
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: zip');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cline: { access: write, module: .clinerules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'cursor: { access: write, module: .cursor/rules }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'claude: { access: none, module: .claude }',
    );
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('mill:');
    expect(screen.getByTestId('landing-terminal-vector')).toHaveTextContent(fingerprint(DEFAULTS));

    await user.click(screen.getByTestId('landing-terminal-copy'));
    expect(writeText).toHaveBeenCalled();
    expect(String(writeText.mock.calls[0]?.[0])).toContain('headless: false');

    await user.click(screen.getByTestId('landing-terminal-download'));
    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('POSTs YAML to /api/assemble and downloads a .zip when dest is zip', async () => {
    const user = userEvent.setup();
    const anchors: HTMLAnchorElement[] = [];
    const createObjectURL = vi.fn(() => 'blob:assemble');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = createElement(tagName);
      if (tagName === 'a') {
        el.click = click;
        anchors.push(el as HTMLAnchorElement);
      }
      return el;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(assembleApiUrl());
      expect(String(input)).not.toContain('/adopt');
      expect(init?.method).toBe('POST');
      expect(String(init?.body)).toContain('destination: zip');
      expect(String(init?.body)).not.toContain('mill:');
      expect(String(init?.body)).not.toContain('/adopt');
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="assemble-java-default.zip"',
        }),
        blob: async () =>
          new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: 'application/zip' }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: zip');
    await user.click(screen.getByTestId('landing-terminal-download'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
    });
    expect(anchors[0]?.download).toBe('assemble-java-default.zip');
  });

  it('POSTs an empty body to /api/clone and downloads the course zip, not /api/assemble', async () => {
    const user = userEvent.setup();
    const anchors: HTMLAnchorElement[] = [];
    const createObjectURL = vi.fn(() => 'blob:clone');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = createElement(tagName);
      if (tagName === 'a') {
        el.click = click;
        anchors.push(el as HTMLAnchorElement);
      }
      return el;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(cloneApiUrl());
      expect(String(input)).not.toContain('/assemble');
      expect(String(input)).not.toContain('/adopt');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeUndefined();
      expect(String(init?.body ?? '')).not.toContain('mill');
      expect(String(init?.body ?? '')).not.toContain('coverageProfile');
      expect(String(init?.body ?? '')).not.toContain('destination');
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="clone-as-student.zip"',
        }),
        blob: async () =>
          new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: 'application/zip' }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    expect(screen.getByTestId('landing-clone-course')).toHaveTextContent('as on the course');
    expect(
      within(screen.getByTestId('landing-seg-destination')).queryByRole('button', {
        name: 'as on the course',
      }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByTestId('landing-clone-course'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
    });
    expect(anchors[0]?.download).toBe('clone-as-student.zip');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POSTs dest zip YAML with harness.mill when protect is true', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:mill');
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
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(assembleApiUrl());
      expect(String(input)).not.toContain('/adopt');
      expect(String(init?.body)).toContain('destination: zip');
      expect(String(init?.body)).toContain(
        'mill: { access: write, pack: pack-v1, generation: generation-v1 }',
      );
      expect(String(init?.body)).not.toContain('crystal');
      expect(String(init?.body).toLowerCase()).not.toContain('pat');
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="assemble-java-default.zip"',
        }),
        blob: async () =>
          new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: 'application/zip' }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-mill')).getByRole('button', { name: 'true' }),
    );
    await user.click(screen.getByTestId('landing-terminal-download'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
    });
  });

  it('opens the catalog href on Download and does not POST assemble-zip', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    expect(screen.queryByTestId('landing-catalog-href')).not.toBeInTheDocument();
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'catalog',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: catalog');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      `profile: ${TAKEAWAY_TESTS_STACK}`,
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
    );
    const href = screen.getByTestId('landing-catalog-href');
    expect(href).toHaveAttribute(
      'href',
      'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
    );
    expect(href).toHaveAttribute('target', '_blank');
    expect(href).toHaveAttribute('rel', 'noopener noreferrer');

    await user.click(screen.getByTestId('landing-terminal-download'));
    expect(open).toHaveBeenCalledWith(
      'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
      '_blank',
      'noopener',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens catalog href with mill write and does not POST assemble-zip', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-mill')).getByRole('button', { name: 'true' }),
    );
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'catalog',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'mill: { access: write, pack: pack-v1, generation: generation-v1 }',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: catalog');
    await user.click(screen.getByTestId('landing-terminal-download'));
    expect(open).toHaveBeenCalledWith(
      'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
      '_blank',
      'noopener',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads cloud as yaml and does not POST assemble-zip or open catalog', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn(() => 'blob:cloud');
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
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'cloud',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: cloud');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('org: autotests-cloud');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('via: idp');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent(
      'https://github.com/autotests-ai/',
    );
    expect(screen.queryByTestId('landing-catalog-href')).not.toBeInTheDocument();
    expect(screen.queryByTestId('landing-user-oauth')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('landing-terminal-download'));
    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    expect(open).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hides the dest cloud IdP button when client env is missing', async () => {
    vi.spyOn(idpGate, 'configured').mockReturnValue(false);
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'cloud',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('via: idp');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('login:');
    expect(screen.queryByTestId('landing-cloud-idp')).not.toBeInTheDocument();
    expect(screen.queryByTestId('landing-user-oauth')).not.toBeInTheDocument();
  });

  it('starts school IdP from dest cloud and does not start GitHub OAuth', async () => {
    const user = userEvent.setup();
    const go = vi.spyOn(idpAssign, 'go').mockImplementation(() => undefined);
    const githubGo = vi.spyOn(githubOAuthAssign, 'go').mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'cloud',
      }),
    );
    await user.click(screen.getByTestId('landing-cloud-idp'));
    expect(go).toHaveBeenCalledTimes(1);
    const href = String(go.mock.calls[0]?.[0]);
    expect(href).toContain('https://idp.example/auth');
    expect(href).toContain('client_id=test-idp-client');
    expect(href).toContain('response_type=code');
    expect(href).toContain('scope=openid');
    expect(href).not.toContain('github.com/login');
    expect(href).not.toContain('token');
    expect(githubGo).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('via: idp');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('login:');
  });

  it('prints the school login only after a real IdP session', async () => {
    writeIdpSession({ login: 'qaguru' });
    const user = userEvent.setup();
    const go = vi.spyOn(idpAssign, 'go').mockImplementation(() => undefined);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'cloud',
      }),
    );
    const idp = screen.getByTestId('landing-cloud-idp');
    expect(idp).toHaveAttribute('title', 'qaguru');
    expect(idp).not.toHaveAttribute('href');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('login: qaguru');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('via: idp');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent(
      'autotests-cloud/qaguru',
    );
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('via: oauth');
    expect(screen.queryByTestId('landing-user-oauth')).not.toBeInTheDocument();
    await user.click(idp);
    expect(go).not.toHaveBeenCalled();
  });

  it('downloads user as yaml and does not POST assemble-zip or open catalog', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn(() => 'blob:user');
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
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'user',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: user');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('via: oauth');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent(
      'org: autotests-cloud',
    );
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent(
      'https://github.com/autotests-ai/',
    );
    expect(screen.queryByTestId('landing-catalog-href')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-user-oauth')).toHaveAttribute(
      'aria-label',
      'Continue with GitHub',
    );
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pat/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /token/i })).not.toBeInTheDocument();

    await user.click(screen.getByTestId('landing-terminal-download'));
    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    expect(open).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts GitHub OAuth from dest user and does not keep a PAT', async () => {
    const user = userEvent.setup();
    const go = vi.spyOn(githubOAuthAssign, 'go').mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    expect(screen.queryByTestId('landing-user-oauth')).not.toBeInTheDocument();
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'user',
      }),
    );
    await user.click(screen.getByTestId('landing-user-oauth'));
    expect(go).toHaveBeenCalledTimes(1);
    const href = String(go.mock.calls[0]?.[0]);
    expect(href).toContain('https://github.com/login/oauth/authorize');
    expect(href).toContain('client_id=test-github-oauth-client');
    expect(href).toContain('scope=repo');
    expect(href).not.toContain('public_repo');
    expect(href).not.toContain('token');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('via: oauth');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('login:');
  });

  it('prints the GitHub profile URL only after a real login', async () => {
    writeGithubUserSession({ login: 'octocat' });
    const user = userEvent.setup();
    const go = vi.spyOn(githubOAuthAssign, 'go').mockImplementation(() => undefined);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'user',
      }),
    );
    const oauth = screen.getByTestId('landing-user-oauth');
    expect(oauth).toHaveAttribute('href', 'https://github.com/octocat');
    expect(oauth).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('login: octocat');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'https://github.com/octocat',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).not.toHaveTextContent('token');
    expect(go).not.toHaveBeenCalled();
  });

  it('downloads created true after dest user create and push and never a PAT', async () => {
    writeGithubUserSession({ login: 'octocat' });
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const repoUrl = `https://github.com/octocat/${TAKEAWAY_TESTS_STACK}`;
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      const href = String(url);
      if (href.includes('/repos/contents')) {
        return {
          ok: true,
          json: async () => ({ login: 'octocat', url: repoUrl, pushed: true }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ login: 'octocat', url: repoUrl, created: true }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const blobs: string[] = [];
    vi.stubGlobal(
      'Blob',
      class {
        constructor(init?: BlobPart[]) {
          blobs.push(String(init?.[0] ?? ''));
        }
      },
    );
    const createObjectURL = vi.fn(() => 'blob:home-user');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
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
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'user',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    await user.click(screen.getByTestId('landing-terminal-download'));
    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/oauth\/github\/repos$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining(`stack: ${TAKEAWAY_TESTS_STACK}`),
        headers: expect.objectContaining({ 'Content-Type': 'application/yaml' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/oauth/github/repos/contents'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining('destination: zip'),
      }),
    );
    const createInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(String(createInit?.body)).toContain(`stack: ${TAKEAWAY_TESTS_STACK}`);
    expect(String(createInit?.body)).toContain('coverageProfile:');
    const pushInit = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(String(pushInit?.body)).toContain('coverageProfile:');
    expect(String(pushInit?.body)).not.toContain('destination: user');
    expect(String(fetchMock.mock.calls.map(([url]) => String(url)).join(' '))).not.toContain(
      '3032',
    );
    expect(open).not.toHaveBeenCalled();
    expect(blobs[0]).toContain('created: true');
    expect(blobs[0]).toContain('pushed: true');
    expect(blobs[0]).toContain(repoUrl);
    expect(blobs[0]).not.toContain('token');
    expect(blobs[0]?.toLowerCase()).not.toContain('pat');
  });

  it('downloads created true after dest cloud create and push and never a PAT', async () => {
    writeIdpSession({ login: 'qaguru' });
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const repoUrl = `https://github.com/autotests-cloud/qaguru-${TAKEAWAY_TESTS_STACK}`;
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      const href = String(url);
      if (href.includes('/repos/contents')) {
        return {
          ok: true,
          json: async () => ({ login: 'qaguru', url: repoUrl, pushed: true }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ login: 'qaguru', url: repoUrl, created: true }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const blobs: string[] = [];
    vi.stubGlobal(
      'Blob',
      class {
        constructor(init?: BlobPart[]) {
          blobs.push(String(init?.[0] ?? ''));
        }
      },
    );
    const createObjectURL = vi.fn(() => 'blob:home-cloud');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
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
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'cloud',
      }),
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('created: false');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('login: qaguru');
    await user.click(screen.getByTestId('landing-terminal-download'));
    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/cloud\/repos$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining(`stack: ${TAKEAWAY_TESTS_STACK}`),
        headers: expect.objectContaining({ 'Content-Type': 'application/yaml' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/cloud/repos/contents'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining('destination: zip'),
      }),
    );
    const createInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(String(createInit?.body)).toContain(`stack: ${TAKEAWAY_TESTS_STACK}`);
    expect(String(createInit?.body)).toContain('coverageProfile:');
    expect(String(createInit?.body)).toContain('destination: zip');
    expect(String(createInit?.body)).not.toContain('destination: cloud');
    const pushInit = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(String(pushInit?.body)).toContain('coverageProfile:');
    expect(String(pushInit?.body)).not.toContain('destination: cloud');
    expect(String(fetchMock.mock.calls.map(([url]) => String(url)).join(' '))).not.toContain(
      '/oauth/github',
    );
    expect(open).not.toHaveBeenCalled();
    expect(blobs[0]).toContain('created: true');
    expect(blobs[0]).toContain('pushed: true');
    expect(blobs[0]).toContain(repoUrl);
    expect(blobs[0]).toContain('via: idp');
    expect(blobs[0]).not.toContain('token');
    expect(blobs[0]?.toLowerCase()).not.toContain('pat');
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
    expect(screen.getByTestId('landing-seg-mill')).toHaveTextContent(ru.home.millProtect);
    expect(screen.getByTestId('landing-import-title')).toHaveTextContent(ru.home.panelImport);
    expect(screen.getByTestId('landing-destination-title')).toHaveTextContent(
      ru.home.panelDestination,
    );
    expect(screen.getByTestId('landing-clone-course')).toHaveTextContent(ru.home.cloneCourse);
    expect(screen.getByTestId('landing-build-title')).toHaveTextContent(ru.home.panelBuild);
    expect(screen.getByTestId('landing-allure-title')).toHaveTextContent(ru.home.panelAllure);
    expect(screen.getByTestId('landing-driver-title')).toHaveTextContent(ru.home.panelDriver);
    expect(screen.getByTestId('landing-remote-title')).toHaveTextContent(ru.home.panelRemote);
    expect(screen.getByTestId('landing-console-title')).toHaveTextContent(ru.home.panelConsole);
    expect(screen.getByTestId('landing-testops-title')).toHaveTextContent(ru.home.panelTestops);
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: false');
    expect(screen.getByRole('combobox', { name: 'browser' })).toBeInTheDocument();
  });

  it('imports a public URL via /api/adopt then dest zip via /api/adopt/zip, not /api/assemble', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:adopt');
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
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).not.toContain('/assemble');
      expect(init?.method).toBe('POST');
      if (url === '/api/adopt') {
        expect(String(init?.body)).toContain('https://github.com/org/repo');
        expect(String(init?.body).toLowerCase()).not.toContain('token');
        expect(String(init?.body).toLowerCase()).not.toContain('pat');
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            ok: true,
            mode: 'adopt',
            created: false,
            dest: 'generated-projects/adopt-repo',
          }),
        } as Response);
      }
      expect(url).toBe('/api/adopt/zip');
      expect(String(init?.body)).toContain('generated-projects/adopt-repo');
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="adopt-repo.zip"',
        }),
        blob: async () => new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])]),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    await user.type(screen.getByTestId('landing-field-importUrl'), 'https://github.com/org/repo');
    await user.click(screen.getByTestId('landing-import-run'));

    await waitFor(() => {
      expect(screen.getByTestId('landing-import-output')).toHaveTextContent(
        'generated-projects/adopt-repo',
      );
    });
    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('destination: zip');
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent(
      'adoptDest: generated-projects/adopt-repo',
    );
  });

  it('imports a private URL via /api/oauth/github/adopt, not PAT or /api/assemble', async () => {
    writeGithubUserSession({ login: 'octocat' });
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toBe('/api/oauth/github/adopt');
      expect(url).not.toContain('/assemble');
      expect(url).not.toBe('/api/adopt');
      expect(init?.credentials).toBe('include');
      expect(String(init?.body)).toContain('https://github.com/org/private-repo');
      expect(String(init?.body).toLowerCase()).not.toContain('token');
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          ok: true,
          mode: 'adopt',
          created: false,
          dest: 'generated-projects/adopt-private-repo',
        }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'catalog',
      }),
    );
    await user.type(
      screen.getByTestId('landing-field-importUrl'),
      'https://github.com/org/private-repo',
    );
    await user.click(screen.getByTestId('landing-import-run'));

    await waitFor(() => {
      expect(screen.getByTestId('landing-import-output')).toHaveTextContent(
        'generated-projects/adopt-private-repo',
      );
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('imports a zip via /api/adopt FormData, then dest zip, not /api/assemble', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:adopt');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).not.toContain('/assemble');
      if (url === '/api/adopt') {
        expect(init?.body).toBeInstanceOf(FormData);
        const body = init?.body as FormData;
        const zip = body.get('zip') as File;
        expect(zip.name).toBe('takeaway-like.zip');
        expect(body.get('token')).toBeNull();
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            ok: true,
            mode: 'adopt',
            created: false,
            dest: 'generated-projects/adopt-takeaway-like',
          }),
        } as Response);
      }
      expect(url).toBe('/api/adopt/zip');
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="adopt-takeaway-like.zip"',
        }),
        blob: async () => new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])]),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    const zipInput = screen.getByTestId('landing-field-importZip');
    const zipPlaque = zipInput.closest('.plaque-field');
    const source = screen.getByTestId('landing-import-source');
    expect(source).toHaveClass('plaque-field-grid--duo');
    expect(source.contains(screen.getByTestId('landing-field-importUrl'))).toBe(true);
    expect(source.contains(zipInput)).toBe(true);
    expect(zipInput).not.toBeVisible();
    expect(zipPlaque?.tagName).toBe('LABEL');
    expect(zipPlaque).toHaveClass('plaque-field--divided', 'plaque-field--stretch');
    expect(zipPlaque?.querySelector('.plaque-field__label')).toHaveTextContent('zip');
    expect(screen.getByTestId('landing-import-zip-icon')).toBeInTheDocument();
    expect(zipPlaque?.querySelector('.plaque-field__value')).not.toHaveTextContent('…');
    expect(zipPlaque?.querySelector('.plaque-field__value input[type="file"]')).toBe(zipInput);
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'takeaway-like.zip', {
      type: 'application/zip',
    });
    await user.type(screen.getByTestId('landing-field-importUrl'), 'https://github.com/org/repo');
    await user.upload(zipInput, file);
    expect(screen.getByTestId('landing-field-importUrl')).toHaveValue('');
    expect(screen.queryByTestId('landing-import-zip-icon')).not.toBeInTheDocument();
    expect(zipPlaque?.querySelector('.plaque-field__value')).toHaveTextContent('takeaway-like.zip');
    await user.click(screen.getByTestId('landing-import-run'));

    await waitFor(() => {
      expect(screen.getByTestId('landing-import-output')).toHaveTextContent(
        'generated-projects/adopt-takeaway-like',
      );
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it('does not dest-zip after Import when destination is catalog', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      expect(String(input)).toBe('/api/adopt');
      expect(String(input)).not.toContain('/assemble');
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          ok: true,
          mode: 'adopt',
          created: false,
          dest: 'generated-projects/adopt-repo',
        }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<HomePage />);
    await user.click(
      within(screen.getByTestId('landing-seg-destination')).getByRole('button', {
        name: 'catalog',
      }),
    );
    await user.type(screen.getByTestId('landing-field-importUrl'), 'https://github.com/org/repo');
    await user.click(screen.getByTestId('landing-import-run'));

    await waitFor(() => {
      expect(screen.getByTestId('landing-import-output')).toHaveTextContent(
        'generated-projects/adopt-repo',
      );
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
