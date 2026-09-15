import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ADOPT_STAND_ORIGIN,
  ASSEMBLE_ZIP_ORIGIN,
  adoptApiUrl,
  adoptZipApiUrl,
  assembleApiUrl,
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
  importAdopt,
  isAdoptDest,
  isAgentAccess,
  isAgentId,
  isDestinationId,
  isLoopbackHostname,
  isPublicGithubUrl,
  type LandingConfig,
  MILL_GENERATION,
  MILL_PACK,
  millAccess,
  millSegValue,
  outputFilename,
  postAdoptDestZip,
  setMillAccess,
  shouldAdoptDestZip,
  shouldAssembleZip,
  shouldAssembleZipLoopback,
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

  function oauthDestCloudFetch(repoUrl: string) {
    return vi.fn(async (url: string, _init?: RequestInit) => {
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
  }

  function oauthDestUserFetch(repoUrl: string) {
    return vi.fn(async (url: string, _init?: RequestInit) => {
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

  it('omits harness.mill from the dump until protect is write', () => {
    const yaml = toYaml(DEFAULTS, 'vector#zip');
    expect(yaml).not.toContain('mill:');
    expect(yaml).not.toContain('pack-v1');
    expect(yaml).not.toContain('generation-v1');
    expect(yaml).not.toContain('crystal');
    expect(yaml.toLowerCase()).not.toContain('pat');
    const json = JSON.parse(toJson(DEFAULTS, 'vector#zip')) as {
      coverageProfile: { harness: { mill?: unknown } };
    };
    expect(json.coverageProfile.harness.mill).toBeUndefined();
    expect(millAccess(DEFAULTS.coverageProfile)).toBe('none');
    expect(millSegValue(DEFAULTS.coverageProfile)).toBe('false');
    expect(setMillAccess(DEFAULTS.coverageProfile, 'crystal')).toBe(DEFAULTS.coverageProfile);
  });

  it('dumps harness.mill write with pack-v1 after PlaqueFieldSeg true', () => {
    const profile = setMillAccess(cloneConfig(DEFAULTS).coverageProfile, 'true');
    const config: LandingConfig = {
      ...cloneConfig(DEFAULTS),
      coverageProfile: profile,
    };
    expect(millAccess(profile)).toBe('write');
    expect(millSegValue(profile)).toBe('true');
    expect(profile.harness.mill).toEqual({
      access: 'write',
      pack: MILL_PACK,
      generation: MILL_GENERATION,
    });
    const yaml = toYaml(config, 'vector#mill');
    expect(yaml).toContain('mill: { access: write, pack: pack-v1, generation: generation-v1 }');
    expect(yaml).not.toContain('crystal');
    expect(yaml).not.toContain('--mode mill');
    expect(yaml.toLowerCase()).not.toContain('pat');
    const json = JSON.parse(toJson(config, 'vector#mill')) as {
      coverageProfile: {
        harness: { mill: { access: string; pack: string; generation: string } };
      };
    };
    expect(json.coverageProfile.harness.mill).toEqual({
      access: 'write',
      pack: MILL_PACK,
      generation: MILL_GENERATION,
    });
    const off = setMillAccess(profile, 'false');
    expect(off.harness.mill).toBeUndefined();
    expect(toYaml({ ...config, coverageProfile: off }, 'vector#mill')).not.toContain('mill:');
  });

  it('keeps dest catalog cloud user dumps when mill is write', () => {
    const mill = setMillAccess(cloneConfig(DEFAULTS).coverageProfile, 'true');
    const catalog = toYaml(
      { ...cloneConfig(DEFAULTS), destination: 'catalog', coverageProfile: mill },
      'vector#catalog',
    );
    expect(catalog).toContain('destination: catalog');
    expect(catalog).toContain('catalog:');
    expect(catalog).toContain('mill: { access: write, pack: pack-v1, generation: generation-v1 }');
    expect(catalog).not.toContain('\ncloud:');
    expect(catalog).not.toContain('\nuser:');
    const cloud = toYaml(
      { ...cloneConfig(DEFAULTS), destination: 'cloud', coverageProfile: mill },
      'vector#cloud',
    );
    expect(cloud).toContain('destination: cloud');
    expect(cloud).toContain('via: idp');
    expect(cloud).toContain('created: false');
    expect(cloud).toContain('mill: { access: write, pack: pack-v1, generation: generation-v1 }');
    expect(cloud).not.toContain('via: oauth');
    expect(cloud.toLowerCase()).not.toContain('pat');
    const user = toYaml(
      { ...cloneConfig(DEFAULTS), destination: 'user', coverageProfile: mill },
      'vector#user',
    );
    expect(user).toContain('destination: user');
    expect(user).toContain('via: oauth');
    expect(user).toContain('mill: { access: write, pack: pack-v1, generation: generation-v1 }');
    expect(user).not.toContain('\ncloud:');
    expect(user.toLowerCase()).not.toContain('pat');
    const zip = assembleZipYaml(
      { ...cloneConfig(DEFAULTS), destination: 'user', coverageProfile: mill },
      'vector#user',
    );
    expect(zip).toContain('destination: zip');
    expect(zip).not.toContain('destination: user');
    expect(zip).toContain('mill: { access: write, pack: pack-v1, generation: generation-v1 }');
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
    expect(yaml).not.toContain('mill:');
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
    expect(yaml).toContain('via: idp');
    expect(yaml).not.toContain('\ncatalog:');
    expect(yaml).not.toContain(`${CLOUD_GITHUB_ORG}/`);
    expect(yaml).not.toContain('unknown');
    expect(yaml).not.toContain('via: oauth');
    expect(yaml).not.toContain('login:');
    const json = JSON.parse(toJson(config, 'vector#cloud')) as {
      destination: string;
      cloud: { org: string; created: boolean; via: string; login?: string };
      catalog?: unknown;
      url?: string;
    };
    expect(json.destination).toBe('cloud');
    expect(json.cloud).toEqual(cloudDocument());
    expect(json.cloud.created).toBe(false);
    expect(json.cloud.via).toBe('idp');
    expect(json.cloud.login).toBeUndefined();
    expect(json).not.toHaveProperty('catalog');
    expect(json).not.toHaveProperty('url');
    expect(toYaml(DEFAULTS, 'vector#zip')).not.toContain('\ncloud:');
  });

  it('prints cloud login only after a real IdP session', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'cloud' };
    const yaml = toYaml(config, 'vector#cloud', { idpSession: { login: 'qaguru' } });
    expect(yaml).toContain('via: idp');
    expect(yaml).toContain('created: false');
    expect(yaml).toContain('login: qaguru');
    expect(yaml).not.toContain(`${CLOUD_GITHUB_ORG}/`);
    expect(yaml).not.toContain('via: oauth');
    expect(yaml).not.toContain('token');
    expect(toYaml(config, 'vector#cloud', { idpSession: { login: 'unknown' } })).not.toContain(
      'login:',
    );
    expect(toYaml(config, 'vector#cloud', { githubUser: { login: 'octocat' } })).not.toContain(
      'login: octocat',
    );
    const json = JSON.parse(
      toJson(config, 'vector#cloud', { idpSession: { login: 'qaguru' } }),
    ) as { cloud: { created: boolean; via: string; login?: string; url?: string } };
    expect(json.cloud).toEqual({
      org: CLOUD_GITHUB_ORG,
      created: false,
      via: 'idp',
      login: 'qaguru',
    });
    expect(json.cloud).not.toHaveProperty('url');
  });

  it('prints created true and the org repo URL only after dest cloud create', () => {
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'cloud' };
    const createdCloudRepo = {
      login: 'qaguru',
      url: 'https://github.com/autotests-cloud/qaguru-python-pytest',
      created: true as const,
    };
    const yaml = toYaml(config, 'vector#cloud', {
      idpSession: { login: 'qaguru' },
      createdCloudRepo,
    });
    expect(yaml).toContain('created: true');
    expect(yaml).toContain('via: idp');
    expect(yaml).toContain('login: qaguru');
    expect(yaml).toContain('url: "https://github.com/autotests-cloud/qaguru-python-pytest"');
    expect(yaml).not.toContain('via: oauth');
    expect(yaml).not.toContain('token');
    expect(yaml.toLowerCase()).not.toContain('pat');
    expect(yaml).not.toContain('pushed:');
    expect(cloudDocument({ login: 'qaguru' }, createdCloudRepo)).toEqual({
      org: CLOUD_GITHUB_ORG,
      created: true,
      via: 'idp',
      login: 'qaguru',
      url: createdCloudRepo.url,
    });
    const pushedCloudRepo = { login: 'qaguru', url: createdCloudRepo.url, pushed: true as const };
    const yamlPushed = toYaml(config, 'vector#cloud', {
      idpSession: { login: 'qaguru' },
      createdCloudRepo,
      pushedCloudRepo,
    });
    expect(yamlPushed).toContain('pushed: true');
    expect(yamlPushed).not.toContain('token');
    expect(yamlPushed.toLowerCase()).not.toContain('pat');
    expect(yamlPushed).not.toContain('via: oauth');
    expect(cloudDocument({ login: 'qaguru' }, createdCloudRepo, pushedCloudRepo)).toEqual({
      org: CLOUD_GITHUB_ORG,
      created: true,
      via: 'idp',
      login: 'qaguru',
      url: createdCloudRepo.url,
      pushed: true,
    });
    expect(
      cloudDocument({ login: 'qaguru' }, createdCloudRepo, {
        login: 'qaguru',
        url: 'https://github.com/qaguru/python-pytest',
        pushed: true,
      }),
    ).toEqual(cloudDocument({ login: 'qaguru' }, createdCloudRepo));
    expect(
      cloudDocument({ login: 'qaguru' }, createdCloudRepo, {
        login: 'hubot',
        url: createdCloudRepo.url,
        pushed: true,
      }),
    ).toEqual(cloudDocument({ login: 'qaguru' }, createdCloudRepo));
    expect(
      cloudDocument({ login: 'qaguru' }, createdCloudRepo, {
        login: 'qaguru',
        url: createdCloudRepo.url,
        pushed: false,
      } as unknown as Parameters<typeof cloudDocument>[2]),
    ).toEqual(cloudDocument({ login: 'qaguru' }, createdCloudRepo));
    expect(
      cloudDocument(
        { login: 'qaguru' },
        {
          login: 'qaguru',
          url: 'https://github.com/qaguru/python-pytest',
          created: true,
        },
      ),
    ).toEqual(cloudDocument({ login: 'qaguru' }));
    expect(
      cloudDocument(
        { login: 'qaguru' },
        {
          login: 'unknown',
          url: createdCloudRepo.url,
          created: true,
        },
      ),
    ).toEqual(cloudDocument({ login: 'qaguru' }));
    expect(
      cloudDocument({ login: 'qaguru' }, {
        login: 'qaguru',
        url: createdCloudRepo.url,
        created: false,
      } as unknown as Parameters<typeof cloudDocument>[1]),
    ).toEqual(cloudDocument({ login: 'qaguru' }));
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

  it('prints adoptDest after Import and not etalon dest', () => {
    const yaml = toYaml(DEFAULTS, 'vector#zip', {
      adoptDest: 'generated-projects/adopt-intern-flat',
    });
    expect(yaml).toContain('adoptDest: generated-projects/adopt-intern-flat');
    expect(yaml).not.toContain('generated-projects/assemble-java-default');
    expect(yaml.toLowerCase()).not.toContain('pat');
    expect(toYaml(DEFAULTS, 'vector#zip')).not.toContain('adoptDest:');
    expect(
      toYaml(DEFAULTS, 'vector#zip', { adoptDest: 'generated-projects/assemble-java-default' }),
    ).not.toContain('adoptDest:');
    const json = JSON.parse(
      toJson(DEFAULTS, 'vector#zip', { adoptDest: 'generated-projects/adopt-intern-flat' }),
    ) as { adoptDest?: string };
    expect(json.adoptDest).toBe('generated-projects/adopt-intern-flat');
    expect(
      assembleZipYaml(DEFAULTS, 'vector#zip', {
        adoptDest: 'generated-projects/adopt-intern-flat',
      }),
    ).toContain('adoptDest: generated-projects/adopt-intern-flat');
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
      url: 'https://github.com/octocat/python-pytest',
      created: true as const,
    };
    const yaml = toYaml(config, 'vector#user', {
      githubUser: { login: 'octocat' },
      createdRepo,
    });
    expect(yaml).toContain('created: true');
    expect(yaml).toContain('via: oauth');
    expect(yaml).toContain('login: octocat');
    expect(yaml).toContain('url: "https://github.com/octocat/python-pytest"');
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
    expect(json.coverageProfile.harness).not.toHaveProperty('mill');
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

  it('assembles dest zip via same-origin API; loopback CORS is fallback', () => {
    expect(assembleApiUrl()).toBe('/api/assemble');
    expect(adoptApiUrl()).toBe('/api/adopt');
    expect(adoptZipApiUrl()).toBe('/api/adopt/zip');
    expect(adoptZipApiUrl()).not.toBe(assembleApiUrl());
    expect(adoptApiUrl()).not.toBe(assembleApiUrl());
    expect(ADOPT_STAND_ORIGIN).toBe('http://127.0.0.1:3033');
    expect(ADOPT_STAND_ORIGIN).not.toContain('3032');
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('127.0.0.1')).toBe(true);
    expect(isLoopbackHostname('autotests.ai')).toBe(false);
    expect(shouldAssembleZip('zip')).toBe(true);
    expect(shouldAdoptDestZip('zip')).toBe(true);
    expect(shouldAdoptDestZip('catalog')).toBe(false);
    expect(shouldAdoptDestZip('cloud')).toBe(false);
    expect(shouldAdoptDestZip('user')).toBe(false);
    expect(isAdoptDest('generated-projects/adopt-repo')).toBe(true);
    expect(isAdoptDest('generated-projects/assemble-java-default')).toBe(false);
    expect(shouldAssembleZip('catalog')).toBe(false);
    expect(shouldAssembleZip('cloud')).toBe(false);
    expect(shouldAssembleZip('user')).toBe(false);
    expect(shouldAssembleZipLoopback('localhost')).toBe(true);
    expect(shouldAssembleZipLoopback('127.0.0.1')).toBe(true);
    expect(shouldAssembleZipLoopback('autotests.ai')).toBe(false);
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

  it('POSTs YAML to /api/assemble and downloads the zip body', async () => {
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
      hostname: 'autotests.ai',
      yaml,
      text: yaml,
      textFilename: 'config.yaml',
    });

    expect(kind).toBe('zip');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      assembleApiUrl(),
      expect.objectContaining({
        method: 'POST',
        body: yaml,
        headers: { 'Content-Type': 'application/yaml' },
      }),
    );
    expect(assembleApiUrl()).not.toContain('3032');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/adopt');
    expect(anchors[0]?.download).toBe('assemble-java-default.zip');
    expect(click).toHaveBeenCalled();
  });

  it('imports a public GitHub URL via /api/adopt, never /api/assemble', async () => {
    expect(isPublicGithubUrl('https://github.com/org/repo')).toBe(true);
    expect(isPublicGithubUrl('https://github.com/org/repo?token=ghp_x')).toBe(false);
    expect(isPublicGithubUrl('git@github.com:org/repo.git')).toBe(false);
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(adoptApiUrl());
      expect(String(input)).not.toContain('/assemble');
      expect(String(init?.body)).toContain('https://github.com/org/repo');
      expect(String(init?.body).toLowerCase()).not.toContain('token');
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
    const result = await importAdopt({
      url: 'https://github.com/org/repo',
      file: null,
      hostname: 'autotests.ai',
    });
    expect(result?.dest).toBe('generated-projects/adopt-repo');
    expect(result?.created).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('imports a private URL via /api/oauth/github/adopt cookie, never PAT or /api/assemble', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/oauth/github/adopt');
      expect(String(input)).not.toContain('/assemble');
      expect(String(input)).not.toBe('/api/adopt');
      expect(init?.credentials).toBe('include');
      expect(String(init?.body)).toContain('https://github.com/org/private-repo');
      expect(String(init?.body).toLowerCase()).not.toContain('token');
      expect(String(init?.body).toLowerCase()).not.toContain('pat');
      expect(String(init?.body)).not.toContain('gho_');
      return Promise.resolve({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'oauth cookie missing' }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    const missing = await importAdopt({
      url: 'https://github.com/org/private-repo',
      file: null,
      hostname: 'autotests.ai',
      githubUser: { login: 'octocat' },
    });
    expect(missing?.ok).toBe(false);
    expect(missing?.error).toBe('oauth cookie missing');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/oauth/github/adopt');
      expect(init?.credentials).toBe('include');
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
    const result = await importAdopt({
      url: 'https://github.com/org/private-repo',
      file: null,
      hostname: 'localhost',
      githubUser: { login: 'octocat' },
    });
    expect(result?.dest).toBe('generated-projects/adopt-private-repo');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain('3033');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain('/assemble');
  });

  it('rejects PAT without fetch and falls back to adopt :3033, never assemble-zip', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const pat = await importAdopt({
      url: 'https://github.com/org/repo?token=ghp_x',
      file: null,
      hostname: 'localhost',
    });
    expect(pat?.ok).toBe(false);
    expect(pat?.error).toMatch(/public/i);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === adoptApiUrl()) {
        return Promise.reject(new Error('api down'));
      }
      expect(url).toBe(`${ADOPT_STAND_ORIGIN}/adopt`);
      expect(url).not.toContain('3032');
      expect(url).not.toContain('/assemble');
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
    });
    const zip = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'takeaway-like.zip', {
      type: 'application/zip',
    });
    const result = await importAdopt({
      url: '',
      file: zip,
      hostname: 'localhost',
    });
    expect(result?.dest).toBe('generated-projects/adopt-takeaway-like');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not CORS-fallback when /api/adopt already returned JSON', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      expect(String(input)).toBe(adoptApiUrl());
      return Promise.resolve({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'репо не публичный' }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await importAdopt({
      url: 'https://github.com/org/repo',
      file: null,
      hostname: 'localhost',
    });
    expect(result?.message).toBe('репо не публичный');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('downloads adopt dest zip via /api/adopt/zip, never /api/assemble', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(adoptZipApiUrl());
      expect(String(input)).not.toContain('/assemble');
      expect(init?.method).toBe('POST');
      expect(String(init?.body)).toContain('generated-projects/adopt-repo');
      expect(String(init?.body).toLowerCase()).not.toContain('token');
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
    const zip = await postAdoptDestZip({
      dest: 'generated-projects/adopt-repo',
      hostname: 'autotests.ai',
    });
    expect(zip?.filename).toBe('adopt-repo.zip');
    expect(zip?.blob.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      await postAdoptDestZip({
        dest: 'generated-projects/assemble-java-default',
        hostname: 'localhost',
      }),
    ).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to adopt :3033 /adopt/zip when /api/adopt/zip fails on localhost', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === adoptZipApiUrl()) {
        return Promise.reject(new Error('api down'));
      }
      expect(url).toBe(`${ADOPT_STAND_ORIGIN}/adopt/zip`);
      expect(url).not.toContain('3032');
      expect(url).not.toContain('/assemble');
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
    const zip = await postAdoptDestZip({
      dest: 'generated-projects/adopt-takeaway-like',
      hostname: 'localhost',
    });
    expect(zip?.filename).toBe('adopt-takeaway-like.zip');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not dest-zip on a non-zip body, 4xx, empty blob, or prod when API is down', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      blob: async () => new Blob([new Uint8Array([0x50, 0x4b])]),
    } as Response);
    expect(
      await postAdoptDestZip({ dest: 'generated-projects/adopt-repo', hostname: 'autotests.ai' }),
    ).toBeNull();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      blob: async () => new Blob([new Uint8Array([0x50, 0x4b])]),
    } as Response);
    expect(
      await postAdoptDestZip({ dest: 'generated-projects/adopt-repo', hostname: 'autotests.ai' }),
    ).toBeNull();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/zip' }),
      blob: async () => new Blob([]),
    } as Response);
    expect(
      await postAdoptDestZip({ dest: 'generated-projects/adopt-repo', hostname: 'autotests.ai' }),
    ).toBeNull();

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(
      await postAdoptDestZip({ dest: 'generated-projects/adopt-repo', hostname: 'autotests.ai' }),
    ).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/assemble');
  });

  it('falls back to loopback assemble-zip only when /api/assemble fails on localhost', async () => {
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
    const zipOk = {
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/zip',
        'content-disposition': 'attachment; filename="assemble-java-default.zip"',
      }),
      blob: async () => new Blob([new Uint8Array([0x50, 0x4b])], { type: 'application/zip' }),
    } as Response;
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(zipOk);
    vi.stubGlobal('fetch', fetchMock);

    const kind = await downloadLandingOutput({
      destination: 'zip',
      hostname: 'localhost',
      yaml,
      text: yaml,
      textFilename: 'config.yaml',
    });

    expect(kind).toBe('zip');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      assembleApiUrl(),
      expect.objectContaining({ method: 'POST', body: yaml }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${ASSEMBLE_ZIP_ORIGIN}/assemble`,
      expect.objectContaining({ method: 'POST', body: yaml }),
    );
    expect(anchors[0]?.download).toBe('assemble-java-default.zip');
  });

  it('falls back to text when dest is not zip, API is down, or body is not zip', async () => {
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

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(
      await downloadLandingOutput({
        destination: 'zip',
        hostname: 'autotests.ai',
        yaml: 'destination: zip\n',
        text: 'kind: yaml',
        textFilename: 'config.yaml',
      }),
    ).toBe('text');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      assembleApiUrl(),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('3032');

    fetchMock.mockClear();
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
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:9/assemble',
      expect.objectContaining({ method: 'POST' }),
    );

    const notZip = (headers: Headers) =>
      ({
        ok: true,
        status: 200,
        headers,
        blob: async () => new Blob([new Uint8Array([0x50, 0x4b])]),
      }) as Response;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      blob: async () => new Blob(['{"ok":false}']),
    } as Response);
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

    fetchMock.mockResolvedValueOnce(notZip(new Headers()));
    fetchMock.mockResolvedValueOnce(notZip(new Headers()));
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
    expect(yaml).toContain('via: idp');
    expect(yaml).not.toContain('via: oauth');
    expect(yaml).not.toContain('github.com/login');
  });

  it('cloud push YAML after Import carries adoptDest and never /api/assemble', async () => {
    const repoUrl = 'https://github.com/autotests-cloud/qaguru-java-junit5-rest_assured-selenide';
    const fetchMock = oauthDestCloudFetch(repoUrl);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:adopt-cloud'),
      revokeObjectURL: vi.fn(),
    });
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = createElement(tagName);
      if (tagName === 'a') {
        el.click = click;
      }
      return el;
    });
    const config = cloneConfig(DEFAULTS);
    config.destination = 'cloud';
    await downloadLandingOutput({
      destination: 'cloud',
      hostname: 'localhost',
      yaml: 'destination: cloud\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      idpSession: { login: 'qaguru' },
      landingConfig: config,
      vectorId: 'vector#cloud',
      adoptDest: 'generated-projects/adopt-intern-flat',
    });
    const createBody = String(fetchMock.mock.calls[0]?.[1]?.body ?? '');
    const pushBody = String(fetchMock.mock.calls[1]?.[1]?.body ?? '');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/cloud/repos');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/cloud/repos/contents');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/assemble');
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('/assemble');
    expect(createBody).toContain('adoptDest: generated-projects/adopt-intern-flat');
    expect(pushBody).toContain('adoptDest: generated-projects/adopt-intern-flat');
    expect(pushBody).toContain('destination: zip');
    expect(pushBody).not.toContain('destination: cloud');
    expect(pushBody.toLowerCase()).not.toContain('pat');
  });

  it('POSTs create then push when dest cloud has a session and writes created true', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const repoUrl = 'https://github.com/autotests-cloud/qaguru-python-pytest';
    const fetchMock = oauthDestCloudFetch(repoUrl);
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
    const createObjectURL = vi.fn(() => 'blob:cloud-created');
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

    const config = cloneConfig(DEFAULTS);
    config.destination = 'cloud';
    config.coverageProfile.automation.e2e.stack = 'python-pytest';
    const yaml = toYaml(config, 'vector#cloud', { idpSession: { login: 'qaguru' } });
    const kind = await downloadLandingOutput({
      destination: 'cloud',
      hostname: 'localhost',
      yaml,
      text: yaml,
      textFilename: 'config.yaml',
      idpSession: { login: 'qaguru' },
      landingConfig: config,
      vectorId: 'vector#cloud',
    });

    expect(kind).toBe('text');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/cloud\/repos$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining('stack: python-pytest'),
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
        headers: expect.objectContaining({ 'Content-Type': 'application/yaml' }),
      }),
    );
    const pushBody = String(fetchMock.mock.calls[1]?.[1]?.body ?? '');
    expect(pushBody).toContain('coverageProfile:');
    expect(pushBody).toContain('stack: python-pytest');
    expect(pushBody).toContain('cursor:');
    expect(pushBody).not.toContain('destination: cloud');
    expect(pushBody).not.toContain('destination: user');
    expect(pushBody).not.toContain('3032');
    expect(pushBody).not.toContain('assemble-landing.yaml');
    expect(pushBody).toContain('e2e: { access: write, stack: python-pytest');
    const createBody = String(fetchMock.mock.calls[0]?.[1]?.body ?? '');
    expect(createBody).toContain('destination: zip');
    expect(createBody).toContain('e2e: { access: write, stack: python-pytest');
    expect(createBody).not.toContain('destination: cloud');
    expect(createBody).not.toContain('3032');
    expect(createBody.toLowerCase()).not.toContain('pat');
    expect(open).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(blobs[0]).toContain('created: true');
    expect(blobs[0]).toContain('pushed: true');
    expect(blobs[0]).toContain(repoUrl);
    expect(blobs[0]).toContain('via: idp');
    expect(blobs[0]).not.toContain('token');
    expect(blobs[0]?.toLowerCase()).not.toContain('pat');
  });

  it('keeps created false when dest cloud create fails and downloads JSON after success', async () => {
    const createObjectURL = vi.fn(() => 'blob:cloud-json');
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
    const repoUrl = 'https://github.com/autotests-cloud/qaguru-python-pytest';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'qaguru', url: repoUrl, created: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'qaguru', url: repoUrl, pushed: true }),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const config = cloneConfig(DEFAULTS);
    config.destination = 'cloud';
    config.coverageProfile.automation.e2e.stack = 'python-pytest';

    await downloadLandingOutput({
      destination: 'cloud',
      hostname: 'localhost',
      yaml: 'destination: cloud\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      idpSession: { login: 'qaguru' },
      landingConfig: config,
      vectorId: 'vector#cloud',
    });
    expect(blobs[0]).toContain('created: false');
    expect(blobs[0]).toContain('login: qaguru');
    expect(blobs[0]).not.toContain('pushed:');

    await downloadLandingOutput({
      destination: 'cloud',
      hostname: 'localhost',
      yaml: 'destination: cloud\n',
      text: '{}',
      textFilename: 'config.json',
      idpSession: { login: 'qaguru' },
      landingConfig: config,
      vectorId: 'vector#cloud',
      outputTab: 'json',
    });
    expect(blobs[1]).toContain('"created": true');
    expect(blobs[1]).toContain('"pushed": true');
    expect(blobs[1]).toContain(repoUrl);
  });

  it('does not POST create when dest cloud has no session or emit ids', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:cloud'), revokeObjectURL: vi.fn() });
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = createElement(tagName);
      if (tagName === 'a') {
        el.click = click;
      }
      return el;
    });
    const config: LandingConfig = { ...cloneConfig(DEFAULTS), destination: 'cloud' };
    await downloadLandingOutput({
      destination: 'cloud',
      hostname: 'localhost',
      yaml: 'destination: cloud\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      idpSession: { login: 'qaguru' },
      landingConfig: config,
    });
    await downloadLandingOutput({
      destination: 'cloud',
      hostname: 'localhost',
      yaml: 'destination: cloud\n',
      text: 'kind: yaml',
      textFilename: 'config.yaml',
      idpSession: { login: 'qaguru' },
      vectorId: 'vector#cloud',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
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
    const repoUrl = 'https://github.com/octocat/python-pytest';
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

    const config = cloneConfig(DEFAULTS);
    config.destination = 'user';
    config.coverageProfile.automation.e2e.stack = 'python-pytest';
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
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining('stack: python-pytest'),
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
        headers: expect.objectContaining({ 'Content-Type': 'application/yaml' }),
      }),
    );
    const pushBody = String(fetchMock.mock.calls[1]?.[1]?.body ?? '');
    expect(pushBody).toContain('coverageProfile:');
    expect(pushBody).toContain('stack: python-pytest');
    expect(pushBody).toContain('cursor:');
    expect(pushBody).not.toContain('destination: user');
    expect(pushBody).not.toContain('3032');
    expect(pushBody).not.toContain('assemble-landing.yaml');
    expect(pushBody).toContain('e2e: { access: write, stack: python-pytest');
    const createBody = String(fetchMock.mock.calls[0]?.[1]?.body ?? '');
    expect(createBody).toContain('e2e: { access: write, stack: python-pytest');
    expect(createBody).not.toContain(
      'e2e: { access: write, stack: java-junit5-rest_assured-selenide',
    );
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
    const repoUrl = 'https://github.com/octocat/python-pytest';
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
    const config = cloneConfig(DEFAULTS);
    config.destination = 'user';
    config.coverageProfile.automation.e2e.stack = 'python-pytest';

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
