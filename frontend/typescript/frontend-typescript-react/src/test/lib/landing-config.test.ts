import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ASSEMBLE_ZIP_ORIGIN,
  assembleZipYaml,
  buildWrapperOptions,
  CLOUD_GITHUB_ORG,
  catalogDocument,
  catalogHref,
  catalogProfileId,
  cloneConfig,
  cloudDocument,
  copyText,
  DEFAULTS,
  downloadLandingOutput,
  downloadText,
  fingerprint,
  isAgentAccess,
  isAgentId,
  isDestinationId,
  isLoopbackHostname,
  type LandingConfig,
  outputFilename,
  shouldAssembleZip,
  TAKEAWAY_COVERAGE_PROFILE,
  TAKEAWAY_TESTS_STACK,
  toDocument,
  toggleAgentAccess,
  toJson,
  toYaml,
  userDocument,
  vectorHash,
  zipFilenameFromDisposition,
} from '../../lib/landing-config';

describe('landing-config', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function oauthDestUserFetch(repoUrl: string) {
    return vi.fn(async (url: string) => {
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
  }

  it('omits a harness agent from YAML when the profile has no entry', () => {
    const config = cloneConfig(DEFAULTS);
    delete config.coverageProfile.harness.agents.cline;
    const yaml = toYaml(config, 'vector#agents');
    expect(yaml).not.toContain('cline:');
    expect(yaml).toContain('cursor:');
  });

  it('clones images so mutations stay local', () => {
    const copy = cloneConfig(DEFAULTS);
    copy.images.push('edge:120');
    expect(DEFAULTS.images).toEqual(['chrome:148']);
    expect(copy.images).toEqual(['chrome:148', 'edge:120']);
  });

  it('clones coverage profile so agent mutations stay local', () => {
    const copy = cloneConfig(DEFAULTS);
    copy.coverageProfile.harness.agents.cursor.access = 'none';
    copy.destination = 'cloud';
    expect(DEFAULTS.coverageProfile.harness.agents.cursor.access).toBe('write');
    expect(DEFAULTS.destination).toBe('zip');
  });

  it('toggles agent access and ignores unknown or missing agents', () => {
    expect(isAgentAccess('write')).toBe(true);
    expect(isAgentAccess('none')).toBe(true);
    expect(isAgentAccess('read')).toBe(false);
    expect(isAgentId('cursor')).toBe(true);
    expect(isAgentId('not-an-agent')).toBe(false);
    expect(isDestinationId('user')).toBe(true);
    expect(isDestinationId('zip')).toBe(true);
    expect(isDestinationId('nope')).toBe(false);
    const profile = cloneConfig(DEFAULTS).coverageProfile;
    expect(toggleAgentAccess(profile, 'not-an-agent')).toBe(profile);
    const missing = cloneConfig(DEFAULTS).coverageProfile;
    delete missing.harness.agents.cursor;
    expect(toggleAgentAccess(missing, 'cursor')).toBe(missing);
    const toggled = toggleAgentAccess(profile, 'cursor');
    expect(toggled).not.toBe(profile);
    expect(toggled.harness.agents.cursor.access).toBe('none');
    expect(toggleAgentAccess(toggled, 'cursor').harness.agents.cursor.access).toBe('write');
  });

  it('fingerprints the selection as vector# plus 8 hex chars', () => {
    const id = fingerprint(DEFAULTS);
    expect(id).toMatch(/^vector#[0-9a-f]{8}$/);
    expect(vectorHash(DEFAULTS)).toHaveLength(8);
    expect(fingerprint(DEFAULTS)).toBe(id);
    expect(fingerprint({ ...DEFAULTS, headless: 'true' })).not.toBe(id);
    const withCursorNone = cloneConfig(DEFAULTS);
    withCursorNone.coverageProfile.harness.agents.cursor.access = 'none';
    expect(fingerprint(withCursorNone)).not.toBe(id);
    expect(fingerprint({ ...cloneConfig(DEFAULTS), destination: 'catalog' })).not.toBe(id);
  });

  it('maps cfg-keys booleans in the document and keeps empty remoteUrl', () => {
    const doc = toDocument(DEFAULTS);
    expect(doc.headless).toBe(false);
    expect(doc.closeBrowserAfterAll).toBe(true);
    expect(doc.logToConsole).toBe(true);
    expect(doc.testopsEnabled).toBe(false);
    expect(doc.allureQualityGate).toBe(false);
    expect(doc.remoteUrl).toBe('');
    expect(doc.images).toEqual(['chrome:148']);
    expect(doc.images).not.toBe(DEFAULTS.images);
    expect(doc.allureReportMode).toBe('allure3');
    expect(doc.allureAgentMode).toBe('none');
    expect(doc.allureRestAssuredListenerStyle).toBe('default');
    expect(doc.destination).toBe('zip');
    expect(doc.coverageProfile).toEqual(DEFAULTS.coverageProfile);
    expect(doc.coverageProfile).not.toBe(DEFAULTS.coverageProfile);
    expect(doc).not.toHaveProperty('catalog');
    expect(doc).not.toHaveProperty('cloud');
    expect(doc).not.toHaveProperty('user');
    expect(doc).not.toHaveProperty('backend');
    expect(doc).not.toHaveProperty('codeHost');
  });

  it('resolves catalog href from frozen e2e stack and matrix github_org', () => {
    expect(catalogProfileId(TAKEAWAY_COVERAGE_PROFILE)).toBe(TAKEAWAY_TESTS_STACK);
    expect(catalogHref(TAKEAWAY_TESTS_STACK)).toBe(
      'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
    );
    expect(catalogDocument(TAKEAWAY_COVERAGE_PROFILE)).toEqual({
      profile: TAKEAWAY_TESTS_STACK,
      url: 'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
    });
  });

  it('prints live YAML with vector comment, quoted URL, and empty image list', () => {
    const config: LandingConfig = {
      ...cloneConfig(DEFAULTS),
      remoteUrl: 'http://selenoid:4444/wd/hub',
      name: 'true',
      images: [],
    };
    const yaml = toYaml(config, 'vector#deadbeef');
    expect(yaml).toContain('# vector#deadbeef');
    expect(yaml).toContain('headless: false');
    expect(yaml).toContain('closeBrowserAfterAll: true');
    expect(yaml).toContain('remoteUrl: "http://selenoid:4444/wd/hub"');
    expect(yaml).toContain('name: "true"');
    expect(yaml).toContain('images: []');
    expect(yaml).toContain('buildOs: linux');
    expect(yaml).toContain('buildTool: gradle');
    expect(yaml).toContain('buildWrapper: wrapper');
    expect(yaml).toContain('allureReportMode: allure3');
    expect(yaml).toContain('testopsEnabled: false');
    expect(yaml).toContain('destination: zip');
    expect(yaml).toContain('coverageProfile:');
    expect(yaml).toContain('backend: { stack: java-spring, access: write }');
    expect(yaml).toContain('frontend: { stack: typescript-react, access: write }');
    expect(yaml).toContain(
      'unit: { access: write, stack: java-spring, module: backend/java/backend-java-spring }',
    );
    expect(yaml).toContain('load: { access: none, stack: slot, module: "" }');
    expect(yaml).toContain('cline: { access: write, module: .clinerules }');
    expect(yaml).toContain('cursor: { access: write, module: .cursor/rules }');
    expect(yaml).toContain('claude: { access: none, module: .claude }');
    expect(yaml).toContain('codex: { access: none, module: .codex }');
    expect(yaml).toContain('copilot: { access: none, module: .github/copilot-instructions.md }');
    expect(yaml).toContain('gigacode: { access: none, module: .gigacode }');
    expect(yaml).toContain('yandex: { access: none, module: .yandex-code }');
    expect(yaml).not.toContain('codeHost:');
    expect(yaml).not.toContain('backendLanguage:');
    expect(yaml.indexOf('destination: zip')).toBeGreaterThan(yaml.indexOf('testopsEnabled: false'));
  });

  it('prints catalog profile and url when destination is catalog', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'catalog' };
    const yaml = toYaml(config, 'vector#catalog');
    expect(yaml).toContain('destination: catalog');
    expect(yaml).toContain('catalog:');
    expect(yaml).toContain(`profile: ${TAKEAWAY_TESTS_STACK}`);
    expect(yaml).toContain(
      'url: "https://github.com/autotests-ai/java-junit5-rest_assured-selenide"',
    );
    const json = JSON.parse(toJson(config, 'vector#catalog')) as {
      destination: string;
      catalog: { profile: string; url: string };
    };
    expect(json.destination).toBe('catalog');
    expect(json.catalog).toEqual({
      profile: TAKEAWAY_TESTS_STACK,
      url: 'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
    });
    expect(toYaml(DEFAULTS, 'vector#zip')).not.toContain('\ncatalog:');
  });

  it('prints cloud org and created false when destination is cloud', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'cloud' };
    const yaml = toYaml(config, 'vector#cloud');
    expect(yaml).toContain('destination: cloud');
    expect(yaml).toContain('cloud:');
    expect(yaml).toContain(`org: ${CLOUD_GITHUB_ORG}`);
    expect(yaml).toContain('created: false');
    expect(yaml).not.toContain('\ncatalog:');
    expect(yaml).not.toContain(`${CLOUD_GITHUB_ORG}/`);
    expect(yaml).not.toContain('unknown');
    const json = JSON.parse(toJson(config, 'vector#cloud')) as {
      destination: string;
      cloud: { org: string; created: boolean };
      catalog?: unknown;
      url?: string;
    };
    expect(json.destination).toBe('cloud');
    expect(json.cloud).toEqual(cloudDocument());
    expect(json.cloud.created).toBe(false);
    expect(json).not.toHaveProperty('catalog');
    expect(json).not.toHaveProperty('url');
    expect(toYaml(DEFAULTS, 'vector#zip')).not.toContain('\ncloud:');
  });

  it('prints user created false via oauth when destination is user', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'user' };
    const yaml = toYaml(config, 'vector#user');
    expect(yaml).toContain('destination: user');
    expect(yaml).toContain('user:');
    expect(yaml).toContain('created: false');
    expect(yaml).toContain('via: oauth');
    expect(yaml).not.toContain('\ncatalog:');
    expect(yaml).not.toContain('\ncloud:');
    expect(yaml).not.toContain('token');
    expect(yaml).not.toContain('unknown');
    expect(yaml).not.toContain(`${CLOUD_GITHUB_ORG}/`);
    expect(yaml.toLowerCase()).not.toContain('pat');
    const json = JSON.parse(toJson(config, 'vector#user')) as {
      destination: string;
      user: { created: boolean; via: string };
      catalog?: unknown;
      cloud?: unknown;
      url?: string;
      token?: string;
    };
    expect(json.destination).toBe('user');
    expect(json.user).toEqual(userDocument());
    expect(json.user.created).toBe(false);
    expect(json.user.via).toBe('oauth');
    expect(json).not.toHaveProperty('catalog');
    expect(json).not.toHaveProperty('cloud');
    expect(json).not.toHaveProperty('url');
    expect(json).not.toHaveProperty('token');
    expect(toYaml(DEFAULTS, 'vector#zip')).not.toContain('\nuser:');
  });

  it('assembleZipYaml is the dest zip Home dump, not destination user', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'user' };
    config.coverageProfile.harness.agents.cursor.access = 'none';
    const yaml = assembleZipYaml(config, 'vector#user');
    expect(yaml).toContain('destination: zip');
    expect(yaml).not.toContain('destination: user');
    expect(yaml).not.toContain('\nuser:');
    expect(yaml).toContain('coverageProfile:');
    expect(yaml).toContain('cursor: { access: none, module: .cursor/rules }');
    expect(yaml.toLowerCase()).not.toContain('ghp_');
    expect(yaml.toLowerCase()).not.toContain('pat');
    expect(yaml).not.toContain('3032');
    expect(yaml).not.toContain('assemble-landing.yaml');
  });

  it('prints user login URL only after a real GitHub login', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'user' };
    const yaml = toYaml(config, 'vector#user', { githubUser: { login: 'octocat' } });
    expect(yaml).toContain('created: false');
    expect(yaml).toContain('via: oauth');
    expect(yaml).toContain('login: octocat');
    expect(yaml).toContain('url: "https://github.com/octocat"');
    expect(yaml).not.toContain('unknown');
    expect(yaml.toLowerCase()).not.toContain('pat');
    expect(yaml).not.toContain('token');
    const json = JSON.parse(
      toJson(config, 'vector#user', { githubUser: { login: 'octocat' } }),
    ) as {
      user: { created: boolean; via: string; login: string; url: string };
    };
    expect(json.user).toEqual(userDocument({ login: 'octocat' }));
    expect(json.user.created).toBe(false);
    expect(toYaml(config, 'vector#user', { githubUser: { login: 'unknown' } })).not.toContain(
      'login:',
    );
  });

  it('prints created true and the user repo URL only after GitHub create', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'user' };
    const createdRepo = {
      login: 'octocat',
      url: `https://github.com/octocat/${TAKEAWAY_TESTS_STACK}`,
      created: true as const,
    };
    const yaml = toYaml(config, 'vector#user', {
      githubUser: { login: 'octocat' },
      createdRepo,
    });
    expect(yaml).toContain('created: true');
    expect(yaml).toContain('via: oauth');
    expect(yaml).toContain('login: octocat');
    expect(yaml).toContain(`url: "https://github.com/octocat/${TAKEAWAY_TESTS_STACK}"`);
    expect(yaml).not.toContain('token');
    expect(yaml.toLowerCase()).not.toContain('pat');
    expect(yaml).not.toContain('autotests-cloud');
    expect(userDocument({ login: 'octocat' }, createdRepo)).toEqual({
      created: true,
      via: 'oauth',
      login: 'octocat',
      url: createdRepo.url,
    });
    const pushedRepo = { login: 'octocat', url: createdRepo.url, pushed: true as const };
    const yamlPushed = toYaml(config, 'vector#user', {
      githubUser: { login: 'octocat' },
      createdRepo,
      pushedRepo,
    });
    expect(yamlPushed).toContain('pushed: true');
    expect(yamlPushed).not.toContain('token');
    expect(yamlPushed.toLowerCase()).not.toContain('pat');
    expect(userDocument({ login: 'octocat' }, createdRepo, pushedRepo)).toEqual({
      created: true,
      via: 'oauth',
      login: 'octocat',
      url: createdRepo.url,
      pushed: true,
    });
    expect(
      userDocument({ login: 'octocat' }, createdRepo, {
        login: 'octocat',
        url: 'https://github.com/autotests-cloud/java-junit5-rest_assured-selenide',
        pushed: true,
      }),
    ).toEqual(userDocument({ login: 'octocat' }, createdRepo));
    expect(
      userDocument({ login: 'octocat' }, createdRepo, {
        login: 'hubot',
        url: createdRepo.url,
        pushed: true,
      }),
    ).toEqual(userDocument({ login: 'octocat' }, createdRepo));
    expect(
      userDocument({ login: 'octocat' }, createdRepo, {
        login: 'octocat',
        url: createdRepo.url,
        pushed: false,
      } as unknown as Parameters<typeof userDocument>[2]),
    ).toEqual(userDocument({ login: 'octocat' }, createdRepo));
    expect(
      userDocument(
        { login: 'octocat' },
        {
          login: 'octocat',
          url: 'https://github.com/autotests-cloud/java-junit5-rest_assured-selenide',
          created: true,
        },
      ),
    ).toEqual(userDocument({ login: 'octocat' }));
    expect(
      userDocument({ login: 'octocat' }, { login: 'unknown', url: createdRepo.url, created: true }),
    ).toEqual(userDocument({ login: 'octocat' }));
    expect(
      userDocument({ login: 'octocat' }, {
        login: 'octocat',
        url: createdRepo.url,
        created: false,
      } as unknown as Parameters<typeof userDocument>[1]),
    ).toEqual(userDocument({ login: 'octocat' }));
  });

  it('labels build wrappers from the selected tool', () => {
    expect(buildWrapperOptions('gradle').map((option) => option.label)).toEqual([
      './gradlew',
      'gradle',
    ]);
    expect(buildWrapperOptions('maven').map((option) => option.label)).toEqual(['./mvnw', 'mvn']);
  });

  it('prints a YAML list when images are selected', () => {
    const yaml = toYaml(DEFAULTS, 'vector#abcd1234');
    expect(yaml).toContain('images:');
    expect(yaml).toContain('  - "chrome:148"');
    expect(yaml).not.toContain('images: []');
  });

  it('prints JSON with the vector id', () => {
    const json = JSON.parse(toJson(DEFAULTS, 'vector#abcd1234')) as {
      vector: string;
      headless: boolean;
      destination: string;
      coverageProfile: {
        harness: { agents: { cursor: { access: string } } };
        load: { access: string; stack: string };
      };
    };
    expect(json.vector).toBe('vector#abcd1234');
    expect(json.headless).toBe(false);
    expect(json.destination).toBe('zip');
    expect(json.coverageProfile.harness.agents.cursor.access).toBe('write');
    expect(json.coverageProfile.load.access).toBe('none');
    expect(json.coverageProfile.load.stack).toBe('slot');
  });

  it('picks download names for YAML and JSON tabs', () => {
    expect(outputFilename('yaml')).toBe('config.yaml');
    expect(outputFilename('json')).toBe('config.json');
  });

  it('copies when clipboard exists and no-ops when it does not', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    copyText('hello');
    expect(writeText).toHaveBeenCalledWith('hello');

    vi.stubGlobal('navigator', {});
    expect(() => copyText('hello')).not.toThrow();
  });

  it('downloads a text blob', () => {
    const createObjectURL = vi.fn(() => 'blob:landing');
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

    downloadText('kind: config', 'config.yaml');

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:landing');
  });

  it('assembles a zip only on loopback dest zip', () => {
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('127.0.0.1')).toBe(true);
    expect(isLoopbackHostname('autotests.ai')).toBe(false);
    expect(shouldAssembleZip('zip', 'localhost')).toBe(true);
    expect(shouldAssembleZip('zip', 'autotests.ai')).toBe(false);
    expect(shouldAssembleZip('catalog', 'localhost')).toBe(false);
    expect(shouldAssembleZip('cloud', '127.0.0.1')).toBe(false);
    expect(shouldAssembleZip('user', 'localhost')).toBe(false);
  });

  it('reads a zip filename from Content-Disposition and rejects paths', () => {
    expect(zipFilenameFromDisposition(null)).toBe('assemble.zip');
    expect(zipFilenameFromDisposition('attachment; filename="assemble-java-default.zip"')).toBe(
      'assemble-java-default.zip',
    );
    expect(zipFilenameFromDisposition('inline; filename="../../evil.zip"')).toBe('assemble.zip');
    expect(zipFilenameFromDisposition('attachment; filename="foo\\bar.zip"')).toBe('assemble.zip');
    expect(zipFilenameFromDisposition('attachment; filename="config.yaml"')).toBe('assemble.zip');
  });

  it('POSTs YAML to assemble-zip and downloads the zip body', async () => {
    const anchors: HTMLAnchorElement[] = [];
    const createObjectURL = vi.fn(() => 'blob:zip');
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
    const yaml = 'destination: zip\n';
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="assemble-java-default.zip"',
        }),
        blob: async () => new Blob([new Uint8Array([0x50, 0x4b])], { type: 'application/zip' }),
      } as Response),
    );
    vi.stubGlobal('fetch', fetchMock);

    const kind = await downloadLandingOutput({
      destination: 'zip',
      hostname: 'localhost',
      yaml,
      text: yaml,
      textFilename: 'config.yaml',
    });

    expect(kind).toBe('zip');
    expect(fetchMock).toHaveBeenCalledWith(
      `${ASSEMBLE_ZIP_ORIGIN}/assemble`,
      expect.objectContaining({
        method: 'POST',
        body: yaml,
        headers: { 'Content-Type': 'application/yaml' },
      }),
    );
    expect(anchors[0]?.download).toBe('assemble-java-default.zip');
    expect(click).toHaveBeenCalled();
  });

  it('falls back to text when prod, dest is not zip, stand is dead, or body is not zip', async () => {
    const createObjectURL = vi.fn(() => 'blob:text');
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

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(
      await downloadLandingOutput({
        destination: 'zip',
        hostname: 'autotests.ai',
        yaml: 'destination: zip\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
      }),
    ).toBe('text');
    expect(fetchMock).not.toHaveBeenCalled();

    expect(
      await downloadLandingOutput({
        destination: 'cloud',
        hostname: 'localhost',
        yaml: 'destination: cloud\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
      }),
    ).toBe('text');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(
      await downloadLandingOutput({
        destination: 'zip',
        hostname: '127.0.0.1',
        yaml: 'destination: zip\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
        origin: 'http://127.0.0.1:9',
      }),
    ).toBe('text');

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      blob: async () => new Blob(['{"ok":false}']),
    } as Response);
    expect(
      await downloadLandingOutput({
        destination: 'zip',
        hostname: 'localhost',
        yaml: 'destination: zip\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
      }),
    ).toBe('text');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      blob: async () => new Blob(['{"ok":true}']),
    } as Response);
    expect(
      await downloadLandingOutput({
        destination: 'zip',
        hostname: 'localhost',
        yaml: 'destination: zip\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
      }),
    ).toBe('text');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      blob: async () => new Blob([new Uint8Array([0x50, 0x4b])]),
    } as Response);
    expect(
      await downloadLandingOutput({
        destination: 'zip',
        hostname: 'localhost',
        yaml: 'destination: zip\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
      }),
    ).toBe('text');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/zip' }),
      blob: async () => new Blob([]),
    } as Response);
    expect(
      await downloadLandingOutput({
        destination: 'zip',
        hostname: 'localhost',
        yaml: 'destination: zip\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
      }),
    ).toBe('text');
    expect(click).toHaveBeenCalled();
  });

  it('opens the catalog cell href and does not POST assemble-zip', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    const url = catalogHref(TAKEAWAY_TESTS_STACK);
    const kind = await downloadLandingOutput({
      destination: 'catalog',
      hostname: 'localhost',
      yaml: 'destination: catalog\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      catalogUrl: url,
    });

    expect(kind).toBe('catalog');
    expect(open).toHaveBeenCalledWith(url, '_blank', 'noopener');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();

    await downloadLandingOutput({
      destination: 'catalog',
      hostname: 'localhost',
      yaml: 'destination: catalog\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
    });
    expect(open).toHaveBeenCalledWith(url, '_blank', 'noopener');
  });

  it('downloads cloud as yaml and does not POST assemble-zip or open catalog', async () => {
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

    const yaml = toYaml({ ...cloneConfig(DEFAULTS), destination: 'cloud' }, 'vector#cloud');
    const kind = await downloadLandingOutput({
      destination: 'cloud',
      hostname: 'localhost',
      yaml,
      text: yaml,
      textFilename: 'config.yaml',
      catalogUrl: catalogHref(TAKEAWAY_TESTS_STACK),
    });

    expect(kind).toBe('text');
    expect(open).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(yaml).toContain('created: false');
    expect(yaml).toContain(`org: ${CLOUD_GITHUB_ORG}`);
  });

  it('downloads user as yaml and does not POST assemble-zip or open catalog', async () => {
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

    const yaml = toYaml({ ...cloneConfig(DEFAULTS), destination: 'user' }, 'vector#user');
    const kind = await downloadLandingOutput({
      destination: 'user',
      hostname: 'localhost',
      yaml,
      text: yaml,
      textFilename: 'config.yaml',
      catalogUrl: catalogHref(TAKEAWAY_TESTS_STACK),
    });

    expect(kind).toBe('text');
    expect(open).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(yaml).toContain('created: false');
    expect(yaml).toContain('via: oauth');
    expect(yaml).not.toContain('\ncloud:');
    expect(yaml).not.toContain('\ncatalog:');
  });

  it('POSTs create then push when dest user has a session and writes created true', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const repoUrl = `https://github.com/octocat/${TAKEAWAY_TESTS_STACK}`;
    const fetchMock = oauthDestUserFetch(repoUrl);
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
    const createObjectURL = vi.fn(() => 'blob:user-created');
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

    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'user' };
    const yaml = toYaml(config, 'vector#user', { githubUser: { login: 'octocat' } });
    const kind = await downloadLandingOutput({
      destination: 'user',
      hostname: 'localhost',
      yaml,
      text: yaml,
      textFilename: 'config.yaml',
      githubUser: { login: 'octocat' },
      landingConfig: config,
      vectorId: 'vector#user',
    });

    expect(kind).toBe('text');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/oauth\/github\/repos$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/oauth/github/repos/contents'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining('destination: zip'),
        headers: expect.objectContaining({ 'Content-Type': 'application/yaml' }),
      }),
    );
    const pushBody = String(fetchMock.mock.calls[1]?.[1]?.body ?? '');
    expect(pushBody).toContain('coverageProfile:');
    expect(pushBody).toContain('cursor:');
    expect(pushBody).not.toContain('destination: user');
    expect(pushBody).not.toContain('3032');
    expect(pushBody).not.toContain('assemble-landing.yaml');
    expect(open).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(blobs[0]).toContain('created: true');
    expect(blobs[0]).toContain('pushed: true');
    expect(blobs[0]).toContain(repoUrl);
    expect(blobs[0]).not.toContain('token');
    expect(blobs[0]?.toLowerCase()).not.toContain('pat');
  });

  it('keeps created false when dest user create fails and downloads JSON after success', async () => {
    const createObjectURL = vi.fn(() => 'blob:user-json');
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
    const blobs: string[] = [];
    vi.stubGlobal(
      'Blob',
      class {
        constructor(init?: BlobPart[]) {
          blobs.push(String(init?.[0] ?? ''));
        }
      },
    );
    const repoUrl = `https://github.com/octocat/${TAKEAWAY_TESTS_STACK}`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'octocat', url: repoUrl, created: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'octocat', url: repoUrl, pushed: true }),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'user' };

    await downloadLandingOutput({
      destination: 'user',
      hostname: 'localhost',
      yaml: 'destination: user\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      githubUser: { login: 'octocat' },
      landingConfig: config,
      vectorId: 'vector#user',
    });
    expect(blobs[0]).toContain('created: false');
    expect(blobs[0]).toContain('login: octocat');

    await downloadLandingOutput({
      destination: 'user',
      hostname: 'localhost',
      yaml: 'destination: user\n',
      text: '{}',
      textFilename: 'config.json',
      githubUser: { login: 'octocat' },
      landingConfig: config,
      vectorId: 'vector#user',
      outputTab: 'json',
    });
    expect(blobs[1]).toContain('"created": true');
    expect(blobs[1]).toContain('"pushed": true');
    expect(blobs[1]).toContain(repoUrl);
  });

  it('does not POST create when dest user has no session or emit ids', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:user'), revokeObjectURL: vi.fn() });
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = createElement(tagName);
      if (tagName === 'a') {
        el.click = click;
      }
      return el;
    });
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'user' };
    await downloadLandingOutput({
      destination: 'user',
      hostname: 'localhost',
      yaml: 'destination: user\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      githubUser: { login: 'octocat' },
      landingConfig: config,
    });
    await downloadLandingOutput({
      destination: 'user',
      hostname: 'localhost',
      yaml: 'destination: user\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      githubUser: { login: 'octocat' },
      vectorId: 'vector#user',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
