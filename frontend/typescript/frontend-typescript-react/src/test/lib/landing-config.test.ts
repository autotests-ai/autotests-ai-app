import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyBackendFramework,
  applyBackendLanguage,
  applyCodeHost,
  applyFrontendFramework,
  applyFrontendLanguage,
  applyTestsAxis,
  applyTestsLanguage,
  backendFrameworks,
  cloneConfig,
  copyText,
  DEFAULTS,
  downloadText,
  fingerprint,
  frontendFrameworks,
  type LandingConfig,
  outputFilename,
  testAxisOptions,
  toDocument,
  toJson,
  toYaml,
  vectorHash,
} from '../../lib/landing-config';

describe('landing-config', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('clones images so mutations stay local', () => {
    const copy = cloneConfig(DEFAULTS);
    copy.images.push('edge:120');
    expect(DEFAULTS.images).toEqual(['chrome:148']);
    expect(copy.images).toEqual(['chrome:148', 'edge:120']);
  });

  it('fingerprints the selection as vector# plus 8 hex chars', () => {
    const id = fingerprint(DEFAULTS);
    expect(id).toMatch(/^vector#[0-9a-f]{8}$/);
    expect(vectorHash(DEFAULTS)).toHaveLength(8);
    expect(fingerprint(DEFAULTS)).toBe(id);
    expect(fingerprint({ ...DEFAULTS, headless: 'true' })).not.toBe(id);
  });

  it('follows the matching CI default until the runner is chosen explicitly', () => {
    const gitlab = applyCodeHost(cloneConfig(DEFAULTS), 'gitlab.qa.guru');
    expect(gitlab.codeHost).toBe('gitlab.qa.guru');
    expect(gitlab.ciRunner).toBe('gitlab-self-hosted');

    const jenkins: LandingConfig = { ...cloneConfig(DEFAULTS), ciRunner: 'jenkins' };
    const keep = applyCodeHost(jenkins, 'gitlab.com/qa-guru');
    expect(keep.codeHost).toBe('gitlab.com/qa-guru');
    expect(keep.ciRunner).toBe('jenkins');

    const unknown = applyCodeHost(cloneConfig(DEFAULTS), 'gitea.example');
    expect(unknown.codeHost).toBe('gitea.example');
    expect(unknown.ciRunner).toBe('github-hosted');
  });

  it('maps cfg-keys booleans in the document and keeps empty remoteUrl', () => {
    const doc = toDocument(DEFAULTS);
    expect(doc.headless).toBe(false);
    expect(doc.closeBrowserAfterAll).toBe(true);
    expect(doc.logToConsole).toBe(true);
    expect(doc.remoteUrl).toBe('');
    expect(doc.images).toEqual(['chrome:148']);
    expect(doc.images).not.toBe(DEFAULTS.images);
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
    expect(yaml).toContain('backendLanguage: java');
    expect(yaml).toContain('backendFramework: spring');
    expect(yaml).toContain('frontendLanguage: typescript');
    expect(yaml).toContain('frontendFramework: react');
    expect(yaml).toContain('testsLanguage: java');
    expect(yaml).toContain('testsBuild: gradle');
    expect(yaml).toContain('backend: backend-java-spring');
    expect(yaml).toContain('frontend: frontend-typescript-react');
    expect(yaml).toContain('tests: tests-java-gradle-junit5-allure3-selenide');
  });

  it('composes catalog module ids from stack axes and skips empty test fields', () => {
    const kotlin = applyBackendLanguage(cloneConfig(DEFAULTS), 'kotlin');
    expect(kotlin.backendFramework).toBe('spring');
    expect(kotlin.backend).toBe('backend-kotlin-spring');

    const python = applyBackendLanguage(kotlin, 'python');
    expect(python.backendFramework).toBe('flask');
    expect(python.backend).toBe('backend-python-flask');

    const fastapi = applyBackendFramework(python, 'fastapi');
    expect(fastapi.backend).toBe('backend-python-fastapi');

    const unknownBackend = applyBackendLanguage(cloneConfig(DEFAULTS), 'cobol');
    expect(unknownBackend.backendFramework).toBe('');
    expect(unknownBackend.backend).toBe('');

    const fallbackFramework = applyBackendFramework(cloneConfig(DEFAULTS), 'missing');
    expect(fallbackFramework.backend).toBe('backend-java-spring');

    const jsFrontend = applyFrontendLanguage(cloneConfig(DEFAULTS), 'javascript');
    expect(jsFrontend.frontendFramework).toBe('react');
    expect(jsFrontend.frontend).toBe('frontend-javascript-react');

    const vue = applyFrontendFramework(jsFrontend, 'vue');
    expect(vue.frontend).toBe('frontend-javascript-vue');

    const jsTests = applyTestsLanguage(cloneConfig(DEFAULTS), 'javascript');
    expect(jsTests.tests).toBe('tests-javascript-playwright');
    expect(jsTests.testsBuild).toBe('');
    const jsDoc = toDocument(jsTests);
    expect(jsDoc.tests).toBe('tests-javascript-playwright');
    expect(jsDoc).not.toHaveProperty('testsBuild');
    expect(jsDoc).not.toHaveProperty('testsRunner');
    expect(jsDoc).not.toHaveProperty('testsAllure');
    expect(jsDoc).toHaveProperty('testsUi', 'playwright');

    const goTests = applyTestsLanguage(cloneConfig(DEFAULTS), 'go');
    expect(goTests.tests).toBe('tests-go-testing-allure3');
    const goDoc = toDocument(goTests);
    expect(goDoc).not.toHaveProperty('testsBuild');
    expect(goDoc).not.toHaveProperty('testsUi');
    expect(goDoc).toHaveProperty('testsRunner', 'testing');
    expect(goDoc).toHaveProperty('testsAllure', 'allure3');

    const maven = applyTestsAxis(cloneConfig(DEFAULTS), 'build', 'maven');
    expect(maven.tests).toBe('tests-java-maven-junit5-allure3-selenide');

    const junit4 = applyTestsAxis(cloneConfig(DEFAULTS), 'runner', 'junit4');
    expect(junit4.tests).toBe('tests-java-gradle-junit4-allure2-selenium');
    expect(junit4.testsAllure).toBe('allure2');
    expect(junit4.testsUi).toBe('selenium');

    const allure2 = applyTestsAxis(cloneConfig(DEFAULTS), 'allure', 'allure2');
    expect(allure2.tests).toBe('tests-java-gradle-junit5-allure2-selenide');

    const selenium = applyTestsAxis(cloneConfig(DEFAULTS), 'ui', 'selenium');
    expect(selenium.tests).toBe('tests-java-gradle-junit5-allure3-selenium');

    const mixed = applyTestsAxis(allure2, 'ui', 'selenium');
    expect(mixed.testsUi).toBe('selenium');
    expect(mixed.tests).toMatch(/selenium$/);

    const pinnedMiss = applyTestsAxis(cloneConfig(DEFAULTS), 'ui', 'cypress');
    expect(pinnedMiss.tests).toBe('tests-java-gradle-junit5-allure3-selenide');

    const unknownTests = applyTestsLanguage(cloneConfig(DEFAULTS), 'cobol');
    expect(unknownTests.tests).toBe('tests-java-gradle-junit5-allure3-selenide');
    expect(unknownTests.testsLanguage).toBe('java');

    expect(backendFrameworks('go').map((option) => option.value)).toEqual(['gin', 'stdlib']);
    expect(frontendFrameworks('typescript').map((option) => option.value)).toContain('react');
    expect(testAxisOptions('javascript', 'ui').map((option) => option.value)).toEqual([
      'playwright',
      'cypress',
    ]);
    expect(testAxisOptions('javascript', 'build')).toEqual([]);
    expect(testAxisOptions('go', 'runner').map((option) => option.label)).toEqual(['testing']);
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
    };
    expect(json.vector).toBe('vector#abcd1234');
    expect(json.headless).toBe(false);
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
});
