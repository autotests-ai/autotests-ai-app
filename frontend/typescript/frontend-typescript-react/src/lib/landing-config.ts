/** Home configurator selection — cfg-keys + harvested presets. Not a matrix profile id. */

export type LandingConfig = {
  buildOs: string;
  buildOsVersion: string;
  buildLanguage: string;
  javaVersion: string;
  buildTool: string;
  buildToolVersion: string;
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
  /** Where the repo lives — product axis, not a TestConfig cfg-key. */
  codeHost: string;
  /** Where CI executes — product axis, not a TestConfig cfg-key. */
  ciRunner: string;
  /** Matrix module id (`backends[].id`). Not a generate cell / GitHub profile. */
  backend: string;
  /** Matrix module id (`frontends[].id`). */
  frontend: string;
  /** Matrix module id (`tests.modules[].id`, status=active only). */
  tests: string;
};

export type OutputTabId = 'yaml' | 'json';

const BOOL_KEYS = [
  'headless',
  'closeBrowserAfterEach',
  'closeBrowserAfterAll',
  'enableVnc',
  'enableVideo',
  'enableHar',
  'logToConsole',
  'selenideLogToConsole',
] as const;

type BoolKey = (typeof BOOL_KEYS)[number];

function isBoolKey(key: string): key is BoolKey {
  return (BOOL_KEYS as readonly string[]).includes(key);
}

/** cfg-keys defaults for TestConfig; Build rows from configurator-option-presets. */
export const DEFAULTS: LandingConfig = {
  buildOs: 'linux',
  buildOsVersion: 'ubuntu-24.04',
  buildLanguage: 'java',
  javaVersion: '21',
  buildTool: 'gradle-wrapper',
  buildToolVersion: '9.6.0',
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
  codeHost: 'github.com',
  ciRunner: 'github-hosted',
  backend: 'backend-java-spring',
  frontend: 'frontend-typescript-react',
  tests: 'tests-java-gradle-junit5-allure3-selenide',
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
  { value: 'gradle-system', label: 'gradle (system)' },
  { value: 'gradle-wrapper', label: '.gradlew (wrapper)' },
  { value: 'maven-system', label: 'maven (system)' },
  { value: 'maven-wrapper', label: '.mvn (wrapper)' },
];

export const BUILD_TOOL_VERSIONS = [{ value: '8.14' }, { value: '9.0' }, { value: '9.6.0' }];

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

/** Git forge. GitLab.com group is qa-guru; self-hosted is gitlab.qa.guru. */
export const CODE_HOSTS = [
  { value: 'github.com', label: 'GitHub' },
  { value: 'gitlab.com/qa-guru', label: 'GitLab.com / qa-guru' },
  { value: 'gitlab.qa.guru', label: 'gitlab.qa.guru' },
];

/** CI executor. Hosted = vendor cloud runners; self-hosted = own machines. */
export const CI_RUNNERS = [
  { value: 'github-hosted', label: 'GitHub-hosted' },
  { value: 'github-self-hosted', label: 'GitHub self-hosted' },
  { value: 'gitlab-hosted', label: 'GitLab.com shared' },
  { value: 'gitlab-self-hosted', label: 'gitlab.qa.guru' },
  { value: 'jenkins', label: 'Jenkins' },
];

/** Default runner for a code host — used only while the runner is still that default. */
export const DEFAULT_CI_RUNNER: Record<string, string> = {
  'github.com': 'github-hosted',
  'gitlab.com/qa-guru': 'gitlab-hosted',
  'gitlab.qa.guru': 'gitlab-self-hosted',
};

/**
 * Hub `matrix.yaml` axes, `status: active` only.
 * Values = module ids. Independent picks ≠ a generate cell (no cartesian emit).
 */
export const BACKENDS = [
  { value: 'backend-java-spring', label: 'Java Spring' },
  { value: 'backend-kotlin-spring', label: 'Kotlin Spring' },
  { value: 'backend-python-flask', label: 'Python Flask' },
  { value: 'backend-python-fastapi', label: 'Python FastAPI' },
  { value: 'backend-python-django', label: 'Python Django' },
  { value: 'backend-go-gin', label: 'Go Gin' },
  { value: 'backend-go-stdlib', label: 'Go stdlib' },
  { value: 'backend-javascript-express', label: 'JavaScript Express' },
  { value: 'backend-javascript-nest', label: 'JavaScript Nest' },
  { value: 'backend-typescript-express', label: 'TypeScript Express' },
  { value: 'backend-typescript-nest', label: 'TypeScript Nest' },
];

export const FRONTENDS = [
  { value: 'frontend-javascript-vanilla', label: 'JavaScript Vanilla' },
  { value: 'frontend-javascript-react', label: 'JavaScript React' },
  { value: 'frontend-javascript-angular', label: 'JavaScript Angular' },
  { value: 'frontend-javascript-vue', label: 'JavaScript Vue' },
  { value: 'frontend-javascript-jquery', label: 'JavaScript jQuery' },
  { value: 'frontend-typescript-vanilla', label: 'TypeScript Vanilla' },
  { value: 'frontend-typescript-react', label: 'TypeScript React' },
  { value: 'frontend-typescript-angular', label: 'TypeScript Angular' },
  { value: 'frontend-typescript-vue', label: 'TypeScript Vue' },
  { value: 'frontend-typescript-jquery', label: 'TypeScript jQuery' },
];

export const TESTS = [
  {
    value: 'tests-java-gradle-junit5-allure3-selenide',
    label: 'Java Gradle JUnit5 Allure3 Selenide',
  },
  { value: 'tests-javascript-playwright', label: 'JavaScript Playwright' },
  { value: 'tests-python-selenium', label: 'Python Selenium' },
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
  return { ...config, images: [...config.images] };
}

/** Follow the matching CI default only if the runner is still the previous host's default. */
export function applyCodeHost(config: LandingConfig, codeHost: string): LandingConfig {
  const next = { ...config, codeHost };
  const previousDefault = DEFAULT_CI_RUNNER[config.codeHost];
  if (config.ciRunner === previousDefault) {
    next.ciRunner = DEFAULT_CI_RUNNER[codeHost] ?? config.ciRunner;
  }
  return next;
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
  if (/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(s)) {
    return s;
  }
  return JSON.stringify(s);
}

export function toYaml(config: LandingConfig, vectorId: string): string {
  const lines = [`# ${vectorId}`];
  const doc = toDocument(config);
  for (const [key, value] of Object.entries(doc)) {
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
