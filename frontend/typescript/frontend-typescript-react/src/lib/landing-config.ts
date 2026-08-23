/** Home configurator selection — cfg-keys + harvested presets. Not a matrix profile id. */

export type LandingConfig = {
  buildOs: string;
  buildOsVersion: string;
  buildLanguage: string;
  javaVersion: string;
  buildTool: string;
  buildWrapper: string;
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
  /** CI dependency cache — product axis, not a TestConfig cfg-key. */
  ciCache: string;
  /** Allure TestOps — product axis, not a TestConfig cfg-key. */
  testops: string;
  /** Jira — product axis, not a TestConfig cfg-key. */
  jira: string;
  /** Confluence — product axis, not a TestConfig cfg-key. */
  confluence: string;
  /** SonarQube / SonarCloud — product axis, not a TestConfig cfg-key. */
  sonar: string;
  backendLanguage: string;
  backendFramework: string;
  frontendLanguage: string;
  frontendFramework: string;
  testsLanguage: string;
  testsBuild: string;
  testsRunner: string;
  testsAllure: string;
  testsUi: string;
  /** Derived matrix module id (`backends[].id`). */
  backend: string;
  /** Derived matrix module id (`frontends[].id`). */
  frontend: string;
  /** Derived matrix module id (`tests.modules[].id`). */
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
  'ciCache',
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
  buildTool: 'gradle',
  buildWrapper: 'wrapper',
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
  ciCache: 'true',
  testops: 'selfhosted',
  jira: 'selfhosted',
  confluence: 'selfhosted',
  sonar: 'selfhosted',
  backendLanguage: 'java',
  backendFramework: 'spring',
  frontendLanguage: 'typescript',
  frontendFramework: 'react',
  testsLanguage: 'java',
  testsBuild: 'gradle',
  testsRunner: 'junit5',
  testsAllure: 'allure3',
  testsUi: 'selenide',
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

/** Hosting mode for TestOps / Jira / Confluence / Sonar — 2-opt product axis. */
export const HOSTING_OPTIONS = [
  { value: 'selfhosted', label: 'self-hosted' },
  { value: 'cloud', label: 'cloud' },
];

/** CI executor. Hosted = vendor cloud runners; self-hosted = own machines. */
export const CI_RUNNERS = [
  { value: 'github-hosted', label: 'GitHub-hosted' },
  { value: 'github-self-hosted', label: 'GitHub self-hosted' },
  { value: 'gitlab-hosted', label: 'GitLab.com shared' },
  { value: 'gitlab-self-hosted', label: 'gitlab.qa.guru' },
  { value: 'jenkins', label: 'Jenkins' },
];

/** CI cache on/off — 2-opt product axis. */
export const CI_CACHE_OPTIONS = [
  { value: 'true', label: 'cache' },
  { value: 'false', label: 'no-cache' },
];

/** Default runner for a code host — used only while the runner is still that default. */
export const DEFAULT_CI_RUNNER: Record<string, string> = {
  'github.com': 'github-hosted',
  'gitlab.com/qa-guru': 'gitlab-hosted',
  'gitlab.qa.guru': 'gitlab-self-hosted',
};

type AxisOption = { value: string; label: string };

const AXIS_LABELS: Record<string, string> = {
  java: 'Java',
  kotlin: 'Kotlin',
  python: 'Python',
  go: 'Go',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  spring: 'Spring',
  flask: 'Flask',
  fastapi: 'FastAPI',
  django: 'Django',
  gin: 'Gin',
  stdlib: 'stdlib',
  express: 'Express',
  nest: 'Nest',
  vanilla: 'Vanilla',
  react: 'React',
  angular: 'Angular',
  vue: 'Vue',
  jquery: 'jQuery',
  gradle: 'Gradle',
  maven: 'Maven',
  junit5: 'JUnit 5',
  junit4: 'JUnit 4',
  testng: 'TestNG',
  allure3: 'Allure 3',
  allure2: 'Allure 2',
  no_allure: 'no Allure',
  selenide: 'Selenide',
  selenium: 'Selenium',
  playwright: 'Playwright',
  cypress: 'Cypress',
};

function axisLabel(value: string): string {
  return AXIS_LABELS[value] ?? value;
}

function axisOptions(values: readonly string[]): AxisOption[] {
  return values.map((value) => ({ value, label: axisLabel(value) }));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** Hub `matrix.yaml` backends — language × framework, no invented ids. */
export const BACKEND_MODULES: ReadonlyArray<{
  id: string;
  language: string;
  framework: string;
}> = [
  { id: 'backend-java-spring', language: 'java', framework: 'spring' },
  { id: 'backend-kotlin-spring', language: 'kotlin', framework: 'spring' },
  { id: 'backend-python-flask', language: 'python', framework: 'flask' },
  { id: 'backend-python-fastapi', language: 'python', framework: 'fastapi' },
  { id: 'backend-python-django', language: 'python', framework: 'django' },
  { id: 'backend-go-gin', language: 'go', framework: 'gin' },
  { id: 'backend-go-stdlib', language: 'go', framework: 'stdlib' },
  { id: 'backend-javascript-express', language: 'javascript', framework: 'express' },
  { id: 'backend-javascript-nest', language: 'javascript', framework: 'nest' },
  { id: 'backend-typescript-express', language: 'typescript', framework: 'express' },
  { id: 'backend-typescript-nest', language: 'typescript', framework: 'nest' },
];

/** Hub `matrix.yaml` frontends — language × UI kit. */
export const FRONTEND_MODULES: ReadonlyArray<{
  id: string;
  language: string;
  framework: string;
}> = [
  { id: 'frontend-javascript-vanilla', language: 'javascript', framework: 'vanilla' },
  { id: 'frontend-javascript-react', language: 'javascript', framework: 'react' },
  { id: 'frontend-javascript-angular', language: 'javascript', framework: 'angular' },
  { id: 'frontend-javascript-vue', language: 'javascript', framework: 'vue' },
  { id: 'frontend-javascript-jquery', language: 'javascript', framework: 'jquery' },
  { id: 'frontend-typescript-vanilla', language: 'typescript', framework: 'vanilla' },
  { id: 'frontend-typescript-react', language: 'typescript', framework: 'react' },
  { id: 'frontend-typescript-angular', language: 'typescript', framework: 'angular' },
  { id: 'frontend-typescript-vue', language: 'typescript', framework: 'vue' },
  { id: 'frontend-typescript-jquery', language: 'typescript', framework: 'jquery' },
];

type TestModule = {
  id: string;
  language: string;
  build: string;
  runner: string;
  allure: string;
  ui: string;
  status: 'active' | 'slot';
};

/**
 * Hub `tests.modules` parsed into axes. Slots included so tests have more
 * fields; ids stay catalog-only (no cartesian invent).
 */
export const TEST_MODULES: readonly TestModule[] = [
  {
    id: 'tests-java-gradle-junit5-allure3-selenide',
    language: 'java',
    build: 'gradle',
    runner: 'junit5',
    allure: 'allure3',
    ui: 'selenide',
    status: 'active',
  },
  {
    id: 'tests-java-gradle-junit5-allure3-selenium',
    language: 'java',
    build: 'gradle',
    runner: 'junit5',
    allure: 'allure3',
    ui: 'selenium',
    status: 'slot',
  },
  {
    id: 'tests-java-gradle-junit5-allure2-selenide',
    language: 'java',
    build: 'gradle',
    runner: 'junit5',
    allure: 'allure2',
    ui: 'selenide',
    status: 'slot',
  },
  {
    id: 'tests-java-gradle-junit5-no_allure-selenide',
    language: 'java',
    build: 'gradle',
    runner: 'junit5',
    allure: 'no_allure',
    ui: 'selenide',
    status: 'slot',
  },
  {
    id: 'tests-java-gradle-junit4-allure2-selenium',
    language: 'java',
    build: 'gradle',
    runner: 'junit4',
    allure: 'allure2',
    ui: 'selenium',
    status: 'slot',
  },
  {
    id: 'tests-java-gradle-testng-allure3-selenium',
    language: 'java',
    build: 'gradle',
    runner: 'testng',
    allure: 'allure3',
    ui: 'selenium',
    status: 'slot',
  },
  {
    id: 'tests-java-maven-junit5-allure3-selenide',
    language: 'java',
    build: 'maven',
    runner: 'junit5',
    allure: 'allure3',
    ui: 'selenide',
    status: 'slot',
  },
  {
    id: 'tests-kotlin-gradle-junit5-allure3-selenide',
    language: 'kotlin',
    build: 'gradle',
    runner: 'junit5',
    allure: 'allure3',
    ui: 'selenide',
    status: 'slot',
  },
  {
    id: 'tests-javascript-playwright',
    language: 'javascript',
    build: '',
    runner: '',
    allure: '',
    ui: 'playwright',
    status: 'active',
  },
  {
    id: 'tests-javascript-cypress',
    language: 'javascript',
    build: '',
    runner: '',
    allure: '',
    ui: 'cypress',
    status: 'slot',
  },
  {
    id: 'tests-typescript-playwright',
    language: 'typescript',
    build: '',
    runner: '',
    allure: '',
    ui: 'playwright',
    status: 'slot',
  },
  {
    id: 'tests-python-selenium',
    language: 'python',
    build: '',
    runner: '',
    allure: '',
    ui: 'selenium',
    status: 'active',
  },
  {
    id: 'tests-python-playwright',
    language: 'python',
    build: '',
    runner: '',
    allure: '',
    ui: 'playwright',
    status: 'slot',
  },
  {
    id: 'tests-go-testing-allure3',
    language: 'go',
    build: '',
    runner: 'testing',
    allure: 'allure3',
    ui: '',
    status: 'slot',
  },
];

export const BACKEND_LANGUAGES = axisOptions(unique(BACKEND_MODULES.map((m) => m.language)));
export const FRONTEND_LANGUAGES = axisOptions(unique(FRONTEND_MODULES.map((m) => m.language)));
export const TEST_LANGUAGES = axisOptions(unique(TEST_MODULES.map((m) => m.language)));

export function backendFrameworks(language: string): AxisOption[] {
  return axisOptions(
    unique(BACKEND_MODULES.filter((m) => m.language === language).map((m) => m.framework)),
  );
}

export function frontendFrameworks(language: string): AxisOption[] {
  return axisOptions(
    unique(FRONTEND_MODULES.filter((m) => m.language === language).map((m) => m.framework)),
  );
}

export type TestAxis = 'build' | 'runner' | 'allure' | 'ui';

export function testAxisOptions(language: string, axis: TestAxis): AxisOption[] {
  return axisOptions(
    unique(
      TEST_MODULES.filter((m) => m.language === language)
        .map((m) => m[axis])
        .filter((value) => value !== ''),
    ),
  );
}

function composePair(
  modules: ReadonlyArray<{ id: string; language: string; framework: string }>,
  language: string,
  framework: string,
): string {
  return (
    modules.find((m) => m.language === language && m.framework === framework)?.id ??
    modules.find((m) => m.language === language)?.id ??
    ''
  );
}

function snapFramework(
  modules: ReadonlyArray<{ language: string; framework: string }>,
  language: string,
  framework: string,
): string {
  const forLang = modules.filter((m) => m.language === language);
  return forLang.some((m) => m.framework === framework) ? framework : (forLang[0]?.framework ?? '');
}

export function applyBackendLanguage(config: LandingConfig, language: string): LandingConfig {
  const framework = snapFramework(BACKEND_MODULES, language, config.backendFramework);
  return {
    ...config,
    backendLanguage: language,
    backendFramework: framework,
    backend: composePair(BACKEND_MODULES, language, framework),
  };
}

export function applyBackendFramework(config: LandingConfig, framework: string): LandingConfig {
  return {
    ...config,
    backendFramework: framework,
    backend: composePair(BACKEND_MODULES, config.backendLanguage, framework),
  };
}

export function applyFrontendLanguage(config: LandingConfig, language: string): LandingConfig {
  const framework = snapFramework(FRONTEND_MODULES, language, config.frontendFramework);
  return {
    ...config,
    frontendLanguage: language,
    frontendFramework: framework,
    frontend: composePair(FRONTEND_MODULES, language, framework),
  };
}

export function applyFrontendFramework(config: LandingConfig, framework: string): LandingConfig {
  return {
    ...config,
    frontendFramework: framework,
    frontend: composePair(FRONTEND_MODULES, config.frontendLanguage, framework),
  };
}

function testScore(module: TestModule, config: LandingConfig): number {
  let score = module.status === 'active' ? 1 : 0;
  if (module.build === config.testsBuild) score += 2;
  if (module.runner === config.testsRunner) score += 2;
  if (module.allure === config.testsAllure) score += 2;
  if (module.ui === config.testsUi) score += 2;
  return score;
}

function testAxisConfigKey(
  axis: TestAxis,
): 'testsBuild' | 'testsRunner' | 'testsAllure' | 'testsUi' {
  if (axis === 'build') {
    return 'testsBuild';
  }
  if (axis === 'runner') {
    return 'testsRunner';
  }
  if (axis === 'allure') {
    return 'testsAllure';
  }
  return 'testsUi';
}

function pickTestModule(config: LandingConfig, pinned?: TestAxis): TestModule {
  const sameLang = TEST_MODULES.filter((m) => m.language === config.testsLanguage);
  const matching = pinned
    ? sameLang.filter((m) => m[pinned] === config[testAxisConfigKey(pinned)])
    : sameLang;
  const pool = matching.length > 0 ? matching : sameLang;
  const exact = pool.find(
    (m) =>
      m.build === config.testsBuild &&
      m.runner === config.testsRunner &&
      m.allure === config.testsAllure &&
      m.ui === config.testsUi,
  );
  if (exact) {
    return exact;
  }
  return (
    [...pool].sort((a, b) => testScore(b, config) - testScore(a, config))[0] ?? TEST_MODULES[0]
  );
}

function assignTestModule(config: LandingConfig, module: TestModule): LandingConfig {
  return {
    ...config,
    testsLanguage: module.language,
    testsBuild: module.build,
    testsRunner: module.runner,
    testsAllure: module.allure,
    testsUi: module.ui,
    tests: module.id,
  };
}

export function applyTestsLanguage(config: LandingConfig, language: string): LandingConfig {
  const next = { ...config, testsLanguage: language };
  return assignTestModule(next, pickTestModule(next));
}

export function applyTestsAxis(
  config: LandingConfig,
  axis: TestAxis,
  value: string,
): LandingConfig {
  const next = { ...config, [testAxisConfigKey(axis)]: value };
  return assignTestModule(next, pickTestModule(next, axis));
}

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
    if (
      value === '' &&
      (key === 'testsBuild' || key === 'testsRunner' || key === 'testsAllure' || key === 'testsUi')
    ) {
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
