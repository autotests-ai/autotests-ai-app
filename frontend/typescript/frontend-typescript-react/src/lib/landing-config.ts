/** Home configurator selection — cfg-keys + harvested presets. Not a matrix profile id. */

export type LandingConfig = {
  buildOs: string;
  buildOsVersion: string;
  buildLanguage: string;
  javaVersion: string;
  buildTool: string;
  buildWrapper: string;
  buildToolVersion: string;
  allureReportMode: string;
  allureVersion: string;
  allureAgentMode: string;
  allureQualityGate: string;
  enableAllureSelenideListener: string;
  attachLastScreenshot: string;
  attachPageSource: string;
  attachBrowserConsoleLogs: string;
  attachVideo: string;
  attachHarLogs: string;
  enableAllureRestAssuredListener: string;
  allureRestAssuredListenerStyle: string;
  driverEngine: string;
  browser: string;
  browserVersion: string;
  browserSize: string;
  headless: string;
  images: string[];
  closeBrowserAfterEach: string;
  closeBrowserAfterAll: string;
  remoteUrl: string;
  sessionTimeout: string;
  name: string;
  screenResolution: string;
  enableVnc: string;
  enableVideo: string;
  enableHar: string;
  logToConsole: string;
  selenideLogToConsole: string;
  rootLogLevel: string;
  testopsEnabled: string;
  destination: DestinationId;
  coverageProfile: CoverageProfile;
};

export type DestinationId = 'zip' | 'catalog' | 'cloud' | 'user';
export type AgentAccess = 'write' | 'none';
export type LayerAccess = 'write';

export type ProductSurface = {
  stack: string;
  access: LayerAccess;
};

export type AutomationLayer = {
  access: LayerAccess;
  stack: string;
  module: string;
};

export type AgentModule = {
  access: AgentAccess;
  module: string;
};

/** Load/jmeter is a /stack/ slot, not a pyramid @Layer. */
export type LoadSurface = {
  access: 'none';
  stack: string;
  module: string;
};

export type CoverageProfile = {
  product: {
    backend: ProductSurface;
    frontend: ProductSurface;
  };
  automation: {
    unit: AutomationLayer;
    integration: AutomationLayer;
    component: AutomationLayer;
    api: AutomationLayer;
    ui: AutomationLayer;
    e2e: AutomationLayer;
    manual: AutomationLayer;
  };
  load: LoadSurface;
  harness: {
    agents: {
      cline: AgentModule;
      cursor: AgentModule;
    };
  };
};

const AUTOMATION_LAYERS = [
  'unit',
  'integration',
  'component',
  'api',
  'ui',
  'e2e',
  'manual',
] as const;

/** Frozen takeaway cell — not the matrix catalog. */
export const TAKEAWAY_BACKEND_STACK = 'java-spring';
export const TAKEAWAY_FRONTEND_STACK = 'typescript-react';
export const TAKEAWAY_TESTS_STACK = 'java-junit5-rest_assured-selenide';
export const TAKEAWAY_BACKEND_MODULE = 'backend/java/backend-java-spring';
export const TAKEAWAY_FRONTEND_MODULE = 'frontend/typescript/frontend-typescript-react';
export const TAKEAWAY_TESTS_MODULE = 'tests/java/tests-java-junit5-rest_assured-selenide';
export const TAKEAWAY_LOAD_STACK = 'slot';
export const TAKEAWAY_CLINE_MODULE = '.clinerules';
export const TAKEAWAY_CURSOR_MODULE = '.cursor/rules';

function takeawayLayer(stack: string, module: string): AutomationLayer {
  return { access: 'write', stack, module };
}

export const TAKEAWAY_COVERAGE_PROFILE: CoverageProfile = {
  product: {
    backend: { stack: TAKEAWAY_BACKEND_STACK, access: 'write' },
    frontend: { stack: TAKEAWAY_FRONTEND_STACK, access: 'write' },
  },
  automation: {
    unit: takeawayLayer(TAKEAWAY_BACKEND_STACK, TAKEAWAY_BACKEND_MODULE),
    integration: takeawayLayer(TAKEAWAY_BACKEND_STACK, TAKEAWAY_BACKEND_MODULE),
    component: takeawayLayer(TAKEAWAY_FRONTEND_STACK, TAKEAWAY_FRONTEND_MODULE),
    api: takeawayLayer(TAKEAWAY_TESTS_STACK, TAKEAWAY_TESTS_MODULE),
    ui: takeawayLayer(TAKEAWAY_TESTS_STACK, TAKEAWAY_TESTS_MODULE),
    e2e: takeawayLayer(TAKEAWAY_TESTS_STACK, TAKEAWAY_TESTS_MODULE),
    manual: takeawayLayer(TAKEAWAY_TESTS_STACK, TAKEAWAY_TESTS_MODULE),
  },
  load: { access: 'none', stack: TAKEAWAY_LOAD_STACK, module: '' },
  harness: {
    agents: {
      cline: { access: 'write', module: TAKEAWAY_CLINE_MODULE },
      cursor: { access: 'write', module: TAKEAWAY_CURSOR_MODULE },
    },
  },
};

export const PRODUCT_BACKEND_STACKS = [{ value: TAKEAWAY_BACKEND_STACK }] as const;
export const PRODUCT_FRONTEND_STACKS = [{ value: TAKEAWAY_FRONTEND_STACK }] as const;
export const TESTS_STACKS = [{ value: TAKEAWAY_TESTS_STACK }] as const;
export const LOAD_STACKS = [{ value: TAKEAWAY_LOAD_STACK }] as const;

export const DESTINATIONS = [
  { value: 'zip' },
  { value: 'catalog' },
  { value: 'cloud' },
  { value: 'user' },
] as const;

export const AGENT_ACCESS = [{ value: 'write' }, { value: 'none' }] as const;

export function isDestinationId(value: string): value is DestinationId {
  return DESTINATIONS.some((option) => option.value === value);
}

export function isAgentAccess(value: string): value is AgentAccess {
  return value === 'write' || value === 'none';
}

export function cloneCoverageProfile(profile: CoverageProfile): CoverageProfile {
  return structuredClone(profile);
}

export type OutputTabId = 'yaml' | 'json';

const BOOL_KEYS = [
  'allureQualityGate',
  'enableAllureSelenideListener',
  'attachLastScreenshot',
  'attachPageSource',
  'attachBrowserConsoleLogs',
  'attachVideo',
  'attachHarLogs',
  'enableAllureRestAssuredListener',
  'headless',
  'closeBrowserAfterEach',
  'closeBrowserAfterAll',
  'enableVnc',
  'enableVideo',
  'enableHar',
  'logToConsole',
  'selenideLogToConsole',
  'testopsEnabled',
] as const;

type BoolKey = (typeof BOOL_KEYS)[number];

function isBoolKey(key: string): key is BoolKey {
  return (BOOL_KEYS as readonly string[]).includes(key);
}

/** cfg-keys defaults; Build / Allure rows from configurator-option-presets. */
export const DEFAULTS: LandingConfig = {
  buildOs: 'linux',
  buildOsVersion: 'ubuntu-24.04',
  buildLanguage: 'java',
  javaVersion: '21',
  buildTool: 'gradle',
  buildWrapper: 'wrapper',
  buildToolVersion: '9.6.0',
  allureReportMode: 'allure3',
  allureVersion: '3.13.0',
  allureAgentMode: 'none',
  allureQualityGate: 'false',
  enableAllureSelenideListener: 'false',
  attachLastScreenshot: 'false',
  attachPageSource: 'false',
  attachBrowserConsoleLogs: 'false',
  attachVideo: 'false',
  attachHarLogs: 'false',
  enableAllureRestAssuredListener: 'false',
  allureRestAssuredListenerStyle: 'default',
  driverEngine: 'webdriver',
  browser: 'chrome',
  browserVersion: '148',
  browserSize: '1920x1280',
  headless: 'false',
  images: ['chrome:148'],
  closeBrowserAfterEach: 'false',
  closeBrowserAfterAll: 'true',
  remoteUrl: '',
  sessionTimeout: '60m',
  name: 'Manual session',
  screenResolution: '1920x1080x24',
  enableVnc: 'false',
  enableVideo: 'false',
  enableHar: 'false',
  logToConsole: 'true',
  selenideLogToConsole: 'true',
  rootLogLevel: 'info',
  testopsEnabled: 'false',
  destination: 'zip',
  coverageProfile: cloneCoverageProfile(TAKEAWAY_COVERAGE_PROFILE),
};

export const BUILD_OS = [
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'mac', label: 'macOS' },
];

export const BUILD_OS_VERSIONS = [
  { value: 'windows-11', label: 'Windows 11' },
  { value: 'windows-10', label: 'Windows 10' },
  { value: 'ubuntu-24.04', label: 'Ubuntu 24.04' },
  { value: 'ubuntu-22.04', label: 'Ubuntu 22.04' },
  { value: 'debian-12', label: 'Debian 12' },
  { value: 'macos-15', label: 'macOS 15 (Sequoia)' },
  { value: 'macos-14', label: 'macOS 14 (Sonoma)' },
];

export const BUILD_LANGUAGES = [
  { value: 'java', label: 'Java' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'python', label: 'Python' },
  { value: 'swift', label: 'Swift' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'csharp', label: 'C#' },
];

export const LANGUAGE_VERSIONS = [{ value: '17' }, { value: '21' }, { value: '25' }];

export const BUILD_TOOLS = [
  { value: 'gradle', label: 'Gradle' },
  { value: 'maven', label: 'Maven' },
];

/** Wrapper vs system binary — labels follow the selected build tool. */
export function buildWrapperOptions(tool: string): ReadonlyArray<{ value: string; label: string }> {
  if (tool === 'maven') {
    return [
      { value: 'wrapper', label: './mvnw' },
      { value: 'system', label: 'mvn' },
    ];
  }
  return [
    { value: 'wrapper', label: './gradlew' },
    { value: 'system', label: 'gradle' },
  ];
}

export const BUILD_TOOL_VERSIONS = [{ value: '8.14' }, { value: '9.0' }, { value: '9.6.0' }];

export const ALLURE_REPORT_MODES = [{ value: 'none' }, { value: 'allure2' }, { value: 'allure3' }];

export const ALLURE_VERSIONS = [{ value: '3.14.0' }, { value: '3.13.0' }, { value: '3.12.0' }];

export const BROWSERS = [{ value: 'chrome' }, { value: 'firefox' }, { value: 'edge' }];

export const BROWSER_VERSIONS = [{ value: '148' }, { value: '147' }];

export const BROWSER_SIZES = [
  { value: '1920x1280', label: '1920×1280' },
  { value: '1280x720', label: '1280×720' },
  { value: '768x1024', label: '768×1024' },
  { value: '390x844', label: '390×844' },
];

export const IMAGES = [
  { value: 'chrome:148' },
  { value: 'chrome:147' },
  { value: 'firefox:latest' },
  { value: 'edge:120' },
  { value: 'opera:106' },
];

export const SESSION_TIMEOUTS = [
  { value: '1m' },
  { value: '5m' },
  { value: '15m' },
  { value: '30m' },
  { value: '60m' },
];

export const SCREEN_RESOLUTIONS = [
  { value: '1920x1080x24', label: '1920×1080×24' },
  { value: '1280x1024x24', label: '1280×1024×24' },
  { value: '1366x768x24', label: '1366×768×24' },
  { value: '1920x1080', label: '1920×1080' },
];

export const ROOT_LOG_LEVELS = [
  { value: 'trace' },
  { value: 'debug' },
  { value: 'info' },
  { value: 'warn' },
  { value: 'error' },
];

export const OUTPUT_TABS: ReadonlyArray<{
  id: OutputTabId;
  label: string;
  barLabel: string;
}> = [
  { id: 'yaml', label: 'YAML', barLabel: 'YAML' },
  { id: 'json', label: 'JSON', barLabel: 'JSON' },
];

export function cloneConfig(config: LandingConfig): LandingConfig {
  return {
    ...config,
    images: [...config.images],
    coverageProfile: cloneCoverageProfile(config.coverageProfile),
  };
}

/** Same 8-hex fingerprint as autotests-builder `simpleHash` / `vector#…`. */
export function vectorHash(value: unknown): string {
  const str = JSON.stringify(value);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return `00000000${(h >>> 0).toString(16)}`.slice(-8);
}

export function fingerprint(config: LandingConfig): string {
  return `vector#${vectorHash(config)}`;
}

export function toDocument(config: LandingConfig): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULTS) as (keyof LandingConfig)[]) {
    if (key === 'destination' || key === 'coverageProfile') {
      continue;
    }
    const value = config[key];
    if (key === 'images') {
      doc[key] = [...config.images];
      continue;
    }
    if (isBoolKey(key)) {
      doc[key] = value === 'true';
      continue;
    }
    doc[key] = value;
  }
  doc.destination = config.destination;
  doc.coverageProfile = cloneCoverageProfile(config.coverageProfile);
  return doc;
}

function yamlScalar(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === '') {
    return '""';
  }
  const s = String(value);
  if (/^(true|false)$/i.test(s)) {
    return JSON.stringify(s);
  }
  if (/^[A-Za-z0-9._][A-Za-z0-9_./-]*$/.test(s)) {
    return s;
  }
  return JSON.stringify(s);
}

function yamlFlowMap(record: Record<string, string>): string {
  const body = Object.entries(record)
    .map(([key, value]) => `${key}: ${yamlScalar(value)}`)
    .join(', ');
  return `{ ${body} }`;
}

function yamlCoverageProfile(profile: CoverageProfile): string[] {
  const lines = [
    'coverageProfile:',
    '  product:',
    `    backend: ${yamlFlowMap(profile.product.backend)}`,
    `    frontend: ${yamlFlowMap(profile.product.frontend)}`,
    '  automation:',
  ];
  for (const layer of AUTOMATION_LAYERS) {
    lines.push(`    ${layer}: ${yamlFlowMap(profile.automation[layer])}`);
  }
  lines.push(
    `  load: ${yamlFlowMap(profile.load)}`,
    '  harness:',
    '    agents:',
    `      cline: ${yamlFlowMap(profile.harness.agents.cline)}`,
    `      cursor: ${yamlFlowMap(profile.harness.agents.cursor)}`,
  );
  return lines;
}

export function toYaml(config: LandingConfig, vectorId: string): string {
  const lines = [`# ${vectorId}`];
  const doc = toDocument(config);
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'coverageProfile') {
      lines.push(...yamlCoverageProfile(value as CoverageProfile));
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
        continue;
      }
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${yamlScalar(item)}`);
      }
      continue;
    }
    lines.push(`${key}: ${yamlScalar(value)}`);
  }
  return lines.join('\n');
}

export function toJson(config: LandingConfig, vectorId: string): string {
  return JSON.stringify({ ...toDocument(config), vector: vectorId }, null, 2);
}

export function outputFilename(tab: OutputTabId): string {
  return tab === 'json' ? 'config.json' : 'config.yaml';
}

export function copyText(contents: string): void {
  const clipboard = navigator.clipboard;
  if (!clipboard) {
    return;
  }
  void clipboard.writeText(contents);
}

export function downloadText(contents: string, filename: string): void {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
