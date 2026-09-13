import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildWrapperOptions,
  cloneConfig,
  copyText,
  DEFAULTS,
  downloadText,
  fingerprint,
  type LandingConfig,
  outputFilename,
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

  it('clones coverage profile so agent mutations stay local', () => {
    const copy = cloneConfig(DEFAULTS);
    copy.coverageProfile.harness.agents.cursor.access = 'none';
    copy.destination = 'cloud';
    expect(DEFAULTS.coverageProfile.harness.agents.cursor.access).toBe('write');
    expect(DEFAULTS.destination).toBe('zip');
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
    expect(doc).not.toHaveProperty('backend');
    expect(doc).not.toHaveProperty('codeHost');
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
    expect(yaml).toContain('cline: { access: write, module: .clinerules }');
    expect(yaml).toContain('cursor: { access: write, module: .cursor/rules }');
    expect(yaml).not.toContain('codeHost:');
    expect(yaml).not.toContain('backendLanguage:');
    expect(yaml.indexOf('destination: zip')).toBeGreaterThan(yaml.indexOf('testopsEnabled: false'));
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
      coverageProfile: { harness: { agents: { cursor: { access: string } } } };
    };
    expect(json.vector).toBe('vector#abcd1234');
    expect(json.headless).toBe(false);
    expect(json.destination).toBe('zip');
    expect(json.coverageProfile.harness.agents.cursor.access).toBe('write');
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
