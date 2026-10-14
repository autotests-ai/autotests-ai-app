/** Home configurator selection — cfg-keys + harvested presets. Not a matrix profile id. */

import { apiUrl } from './appBase';
import {
  createGithubUserRepo,
  type GithubCreatedRepo,
  type GithubPushedRepo,
  type GithubUserSession,
  githubOAuthAdoptUrl,
  githubUserUrl,
  isGithubLogin,
  isGithubUserRepoUrl,
  pushGithubUserRepo,
} from './github-oauth';
import {
  type CloudCreatedRepo,
  type CloudPushedRepo,
  createCloudRepo,
  type IdpSession,
  isCloudRepoUrl,
  isSchoolLogin,
  pushCloudRepo,
} from './idp-login';

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

export type CatalogHref = {
  profile: string;
  url: string;
};

export type CloudContract = {
  org: string;
  created: boolean;
  via: 'idp';
  login?: string;
  url?: string;
  pushed?: true;
};

export type UserContract = {
  created: boolean;
  via: 'oauth';
  login?: string;
  url?: string;
  pushed?: true;
};

export type LandingEmitOptions = {
  githubUser?: GithubUserSession | null;
  createdRepo?: GithubCreatedRepo | null;
  pushedRepo?: GithubPushedRepo | null;
  idpSession?: IdpSession | null;
  createdCloudRepo?: CloudCreatedRepo | null;
  pushedCloudRepo?: CloudPushedRepo | null;
  adoptDest?: string | null;
};
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

/** Home PlaqueFieldSeg «защитить»: true/false → write/none. Not a dest channel. */
export type MillSlot = {
  access: AgentAccess;
  pack?: string;
  generation?: string;
};

/** Load/jmeter is a /stack/ slot, not a pyramid @Layer. `slot` keeps access `none`. */
export type LoadSurface = {
  access: LayerAccess | 'none';
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
    agents: Record<string, AgentModule>;
    mill?: MillSlot;
  };
};

export const MILL_PACK = 'pack-v1';
export const MILL_GENERATION = 'generation-v1';

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

/** Pack has cline/cursor; others are slots until an adapter exists (ADR 011). */
export const AGENT_CATALOG = [
  { value: 'cline', module: TAKEAWAY_CLINE_MODULE, title: 'Cline' },
  { value: 'cursor', module: TAKEAWAY_CURSOR_MODULE, title: 'Cursor Agent' },
  { value: 'claude', module: '.claude', title: 'Claude Code' },
  { value: 'codex', module: '.codex', title: 'OpenAI Codex' },
  { value: 'copilot', module: '.github/copilot-instructions.md', title: 'GitHub Copilot' },
  { value: 'gigacode', module: '.gigacode', title: 'GigaCode' },
  { value: 'yandex', module: '.yandex-code', title: 'Yandex Code Assistant' },
] as const;

export type AgentId = (typeof AGENT_CATALOG)[number]['value'];

const DEFAULT_WRITE_AGENTS: ReadonlySet<string> = new Set(['cline', 'cursor']);

export function takeawayAgents(): Record<string, AgentModule> {
  const agents: Record<string, AgentModule> = {};
  for (const agent of AGENT_CATALOG) {
    agents[agent.value] = {
      access: DEFAULT_WRITE_AGENTS.has(agent.value) ? 'write' : 'none',
      module: agent.module,
    };
  }
  return agents;
}

export function isAgentId(value: string): value is AgentId {
  return AGENT_CATALOG.some((agent) => agent.value === value);
}

export function writeAgentIds(agents: Record<string, AgentModule>): string[] {
  return AGENT_CATALOG.filter((agent) => agents[agent.value]?.access === 'write').map(
    (agent) => agent.value,
  );
}

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
    agents: takeawayAgents(),
  },
};

/** Living cells — hub matrix.yaml `backends` rows with status: active (slots not emittable). */
export const PRODUCT_BACKEND_STACKS = [
  { value: 'java-spring', module: 'backend/java/backend-java-spring' },
  { value: 'kotlin-spring', module: 'backend/kotlin/backend-kotlin-spring' },
  { value: 'kotlin-ktor', module: 'backend/kotlin/backend-kotlin-ktor' },
  { value: 'python-flask', module: 'backend/python/backend-python-flask' },
  { value: 'python-fastapi', module: 'backend/python/backend-python-fastapi' },
  { value: 'python-django', module: 'backend/python/backend-python-django' },
  { value: 'go-gin', module: 'backend/go/backend-go-gin' },
  { value: 'go-stdlib', module: 'backend/go/backend-go-stdlib' },
  { value: 'javascript-express', module: 'backend/javascript/backend-javascript-express' },
  { value: 'javascript-nest', module: 'backend/javascript/backend-javascript-nest' },
  { value: 'typescript-express', module: 'backend/typescript/backend-typescript-express' },
  { value: 'typescript-nest', module: 'backend/typescript/backend-typescript-nest' },
  { value: 'csharp-aspnet', module: 'backend/csharp/backend-csharp-aspnet' },
  { value: 'rust-axum', module: 'backend/rust/backend-rust-axum' },
] as const;

/** Hub matrix.yaml `frontends` rows with status: active. */
export const PRODUCT_FRONTEND_STACKS = [
  { value: 'javascript-vanilla', module: 'frontend/javascript/frontend-javascript-vanilla' },
  { value: 'javascript-react', module: 'frontend/javascript/frontend-javascript-react' },
  { value: 'javascript-angular', module: 'frontend/javascript/frontend-javascript-angular' },
  { value: 'javascript-vue', module: 'frontend/javascript/frontend-javascript-vue' },
  { value: 'javascript-jquery', module: 'frontend/javascript/frontend-javascript-jquery' },
  { value: 'typescript-vanilla', module: 'frontend/typescript/frontend-typescript-vanilla' },
  { value: 'typescript-react', module: 'frontend/typescript/frontend-typescript-react' },
  { value: 'typescript-angular', module: 'frontend/typescript/frontend-typescript-angular' },
  { value: 'typescript-vue', module: 'frontend/typescript/frontend-typescript-vue' },
  { value: 'typescript-jquery', module: 'frontend/typescript/frontend-typescript-jquery' },
] as const;

/** Hub matrix.yaml `tests.profiles` — active, non-performance, product-agnostic modules. */
export const TESTS_STACKS = [
  {
    value: 'java-junit5-rest_assured-selenide',
    module: 'tests/java/tests-java-junit5-rest_assured-selenide',
  },
  {
    value: 'java-junit5-rest_assured-selenide-appium',
    module: 'tests/java/tests-java-junit5-rest_assured-selenide-appium',
  },
  {
    value: 'java-junit5-rest_assured-selenium',
    module: 'tests/java/tests-java-junit5-rest_assured-selenium',
  },
  {
    value: 'java-junit5-api_request-playwright',
    module: 'tests/java/tests-java-junit5-api_request-playwright',
  },
  { value: 'java-junit5-rest_assured', module: 'tests/java/tests-java-junit5-rest_assured' },
  { value: 'java-junit5-retrofit2', module: 'tests/java/tests-java-junit5-retrofit2' },
  {
    value: 'python-pytest-requests-selenium',
    module: 'tests/python/tests-python-pytest-requests-selenium',
  },
  {
    value: 'python-pytest-requests-selene',
    module: 'tests/python/tests-python-pytest-requests-selene',
  },
  {
    value: 'python-pytest-api_request-playwright',
    module: 'tests/python/tests-python-pytest-api_request-playwright',
  },
  { value: 'python-pytest-requests', module: 'tests/python/tests-python-pytest-requests' },
  { value: 'python-pytest-httpx', module: 'tests/python/tests-python-pytest-httpx' },
  {
    value: 'javascript-api_request-playwright',
    module: 'tests/javascript/tests-javascript-api_request-playwright',
  },
  { value: 'javascript-playwright', module: 'tests/javascript/tests-javascript-playwright' },
  { value: 'javascript-axios', module: 'tests/javascript/tests-javascript-axios' },
  {
    value: 'typescript-api_request-playwright',
    module: 'tests/typescript/tests-typescript-api_request-playwright',
  },
  { value: 'typescript-axios', module: 'tests/typescript/tests-typescript-axios' },
  { value: 'go-testing-net_http', module: 'tests/go/tests-go-testing-net_http' },
  {
    value: 'go-testing-api_request-playwright',
    module: 'tests/go/tests-go-testing-api_request-playwright',
  },
  {
    value: 'kotlin-junit5-ktor-selenide',
    module: 'tests/kotlin/tests-kotlin-junit5-ktor-selenide',
  },
  {
    value: 'kotlin-junit5-ktor-selenium',
    module: 'tests/kotlin/tests-kotlin-junit5-ktor-selenium',
  },
  {
    value: 'kotlin-junit5-api_request-playwright',
    module: 'tests/kotlin/tests-kotlin-junit5-api_request-playwright',
  },
  { value: 'kotlin-junit5-ktor', module: 'tests/kotlin/tests-kotlin-junit5-ktor' },
  {
    value: 'csharp-nunit-restsharp-selenium',
    module: 'tests/csharp/tests-csharp-nunit-restsharp-selenium',
  },
  { value: 'csharp-nunit-restsharp', module: 'tests/csharp/tests-csharp-nunit-restsharp' },
  {
    value: 'csharp-xunit-api_request-playwright',
    module: 'tests/csharp/tests-csharp-xunit-api_request-playwright',
  },
  { value: 'rust-testing-reqwest', module: 'tests/rust/tests-rust-testing-reqwest' },
  { value: 'rust-testing-selenium', module: 'tests/rust/tests-rust-testing-selenium' },
  {
    value: 'rust-testing-reqwest-selenium',
    module: 'tests/rust/tests-rust-testing-reqwest-selenium',
  },
] as const;

/** `slot` = no load layer; rest — matrix `performance` profiles with status: active. */
export const LOAD_STACKS = [
  { value: 'slot', module: '' },
  { value: 'java-jmeter', module: 'tests/java/tests-java-jmeter' },
  { value: 'java-gatling', module: 'tests/java/tests-java-gatling' },
  { value: 'kotlin-jmeter', module: 'tests/kotlin/tests-kotlin-jmeter' },
  { value: 'kotlin-gatling', module: 'tests/kotlin/tests-kotlin-gatling' },
  { value: 'scala-gatling', module: 'tests/scala/tests-scala-gatling' },
  { value: 'groovy-jmeter', module: 'tests/groovy/tests-groovy-jmeter' },
  { value: 'javascript-gatling', module: 'tests/javascript/tests-javascript-gatling' },
  { value: 'javascript-k6', module: 'tests/javascript/tests-javascript-k6' },
  { value: 'javascript-artillery', module: 'tests/javascript/tests-javascript-artillery' },
  { value: 'typescript-gatling', module: 'tests/typescript/tests-typescript-gatling' },
  { value: 'typescript-k6', module: 'tests/typescript/tests-typescript-k6' },
  { value: 'typescript-artillery', module: 'tests/typescript/tests-typescript-artillery' },
  { value: 'python-locust', module: 'tests/python/tests-python-locust' },
  { value: 'python-yandex_tank', module: 'tests/python/tests-python-yandex_tank' },
  { value: 'go-vegeta', module: 'tests/go/tests-go-vegeta' },
  { value: 'csharp-nbomber', module: 'tests/csharp/tests-csharp-nbomber' },
  { value: 'rust-goose', module: 'tests/rust/tests-rust-goose' },
  { value: 'lua-wrk', module: 'tests/lua/tests-lua-wrk' },
] as const;

type StackOption = { value: string; module: string };

function stackOption(catalog: ReadonlyArray<StackOption>, value: string): StackOption | undefined {
  return catalog.find((option) => option.value === value);
}

/** backend select → product.backend + unit/integration layers live in the backend repo. */
export function setBackendStack(profile: CoverageProfile, value: string): CoverageProfile {
  const option = stackOption(PRODUCT_BACKEND_STACKS, value);
  if (!option) {
    return profile;
  }
  const next = cloneCoverageProfile(profile);
  next.product.backend = { stack: option.value, access: 'write' };
  next.automation.unit = takeawayLayer(option.value, option.module);
  next.automation.integration = takeawayLayer(option.value, option.module);
  return next;
}

/** frontend select → product.frontend + component layer live in the frontend repo. */
export function setFrontendStack(profile: CoverageProfile, value: string): CoverageProfile {
  const option = stackOption(PRODUCT_FRONTEND_STACKS, value);
  if (!option) {
    return profile;
  }
  const next = cloneCoverageProfile(profile);
  next.product.frontend = { stack: option.value, access: 'write' };
  next.automation.component = takeawayLayer(option.value, option.module);
  return next;
}

/** tests select → api/ui/e2e/manual layers share one tests module (canonical takeaway cell). */
export function setTestsStack(profile: CoverageProfile, value: string): CoverageProfile {
  const option = stackOption(TESTS_STACKS, value);
  if (!option) {
    return profile;
  }
  const next = cloneCoverageProfile(profile);
  for (const layer of ['api', 'ui', 'e2e', 'manual'] as const) {
    next.automation[layer] = takeawayLayer(option.value, option.module);
  }
  return next;
}

/** load select → `slot` clears the layer; a performance profile pins its module. */
export function setLoadStack(profile: CoverageProfile, value: string): CoverageProfile {
  const option = stackOption(LOAD_STACKS, value);
  if (!option) {
    return profile;
  }
  const next = cloneCoverageProfile(profile);
  next.load =
    option.value === TAKEAWAY_LOAD_STACK
      ? { access: 'none', stack: TAKEAWAY_LOAD_STACK, module: '' }
      : { access: 'write', stack: option.value, module: option.module };
  return next;
}

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

/** matrix.yaml defaults.generation.github_org — frozen, not invent. */
export const CATALOG_GITHUB_ORG = 'autotests-ai';

/** School contour org. Login after IdP session only. Never unknown. */
export const CLOUD_GITHUB_ORG = 'autotests-cloud';

/** Frozen tests stack → github.com/autotests-ai/<e2e.stack>. */
export function catalogProfileId(profile: CoverageProfile): string {
  return profile.automation.e2e.stack;
}

export function catalogHref(profileId: string, org: string = CATALOG_GITHUB_ORG): string {
  return `https://github.com/${org}/${profileId}`;
}

export function catalogDocument(profile: CoverageProfile): CatalogHref {
  const id = catalogProfileId(profile);
  return { profile: id, url: catalogHref(id) };
}

export function cloudDocument(
  session?: IdpSession | null,
  createdRepo?: CloudCreatedRepo | null,
  pushedRepo?: CloudPushedRepo | null,
): CloudContract {
  if (
    createdRepo &&
    createdRepo.created === true &&
    isSchoolLogin(createdRepo.login) &&
    isCloudRepoUrl(createdRepo.login, createdRepo.url)
  ) {
    const doc: CloudContract = {
      org: CLOUD_GITHUB_ORG,
      created: true,
      via: 'idp',
      login: createdRepo.login,
      url: createdRepo.url,
    };
    if (
      pushedRepo &&
      pushedRepo.pushed === true &&
      pushedRepo.login === createdRepo.login &&
      pushedRepo.url === createdRepo.url
    ) {
      doc.pushed = true;
    }
    return doc;
  }
  const doc: CloudContract = { org: CLOUD_GITHUB_ORG, created: false, via: 'idp' };
  if (session && isSchoolLogin(session.login)) {
    doc.login = session.login;
  }
  return doc;
}

export function userDocument(
  session?: GithubUserSession | null,
  createdRepo?: GithubCreatedRepo | null,
  pushedRepo?: GithubPushedRepo | null,
): UserContract {
  if (
    createdRepo &&
    createdRepo.created === true &&
    isGithubLogin(createdRepo.login) &&
    isGithubUserRepoUrl(createdRepo.login, createdRepo.url)
  ) {
    const doc: UserContract = {
      created: true,
      via: 'oauth',
      login: createdRepo.login,
      url: createdRepo.url,
    };
    if (
      pushedRepo &&
      pushedRepo.pushed === true &&
      pushedRepo.login === createdRepo.login &&
      pushedRepo.url === createdRepo.url
    ) {
      doc.pushed = true;
    }
    return doc;
  }
  const doc: UserContract = { created: false, via: 'oauth' };
  if (session && isGithubLogin(session.login)) {
    doc.login = session.login;
    doc.url = githubUserUrl(session.login);
  }
  return doc;
}

export function openCatalogHref(url: string): void {
  window.open(url, '_blank', 'noopener');
}

export function isAgentAccess(value: string): value is AgentAccess {
  return value === 'write' || value === 'none';
}

export function toggleAgentAccess(profile: CoverageProfile, value: string): CoverageProfile {
  if (!isAgentId(value)) {
    return profile;
  }
  const next = cloneCoverageProfile(profile);
  const current = next.harness.agents[value];
  if (!current) {
    return profile;
  }
  current.access = current.access === 'write' ? 'none' : 'write';
  return next;
}

export function millAccess(profile: CoverageProfile): AgentAccess {
  return profile.harness.mill?.access === 'write' ? 'write' : 'none';
}

export function millSegValue(profile: CoverageProfile): 'true' | 'false' {
  return millAccess(profile) === 'write' ? 'true' : 'false';
}

export function setMillAccess(profile: CoverageProfile, value: string): CoverageProfile {
  if (value !== 'true' && value !== 'false' && value !== 'write' && value !== 'none') {
    return profile;
  }
  const next = cloneCoverageProfile(profile);
  if (value === 'true' || value === 'write') {
    next.harness.mill = {
      access: 'write',
      pack: MILL_PACK,
      generation: MILL_GENERATION,
    };
    return next;
  }
  delete next.harness.mill;
  return next;
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

/** Hub/Playwright keys: not in default Selenide dest. Hidden on Home; omit from dump. */
export const DEST_SKIP_KEYS = [
  'driverEngine',
  'images',
  'sessionTimeout',
  'name',
  'screenResolution',
] as const;

type DestSkipKey = (typeof DEST_SKIP_KEYS)[number];

function isDestSkipKey(key: string): key is DestSkipKey {
  return (DEST_SKIP_KEYS as readonly string[]).includes(key);
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

export function toDocument(
  config: LandingConfig,
  options?: LandingEmitOptions,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULTS) as (keyof LandingConfig)[]) {
    if (key === 'destination' || key === 'coverageProfile' || isDestSkipKey(key)) {
      continue;
    }
    const value = config[key];
    if (isBoolKey(key)) {
      doc[key] = value === 'true';
      continue;
    }
    doc[key] = value;
  }
  doc.destination = config.destination;
  if (isAdoptDest(options?.adoptDest ?? '')) {
    doc.adoptDest = (options?.adoptDest ?? '').trim();
  }
  doc.coverageProfile = cloneCoverageProfile(config.coverageProfile);
  if (config.destination === 'catalog') {
    doc.catalog = catalogDocument(config.coverageProfile);
  }
  if (config.destination === 'cloud') {
    doc.cloud = cloudDocument(
      options?.idpSession,
      options?.createdCloudRepo,
      options?.pushedCloudRepo,
    );
  }
  if (config.destination === 'user') {
    doc.user = userDocument(options?.githubUser, options?.createdRepo, options?.pushedRepo);
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
  lines.push(`  load: ${yamlFlowMap(profile.load)}`, '  harness:', '    agents:');
  for (const agent of AGENT_CATALOG) {
    const entry = profile.harness.agents[agent.value];
    if (entry) {
      lines.push(`      ${agent.value}: ${yamlFlowMap(entry)}`);
    }
  }
  if (millAccess(profile) === 'write') {
    const mill = profile.harness.mill;
    lines.push(
      `    mill: ${yamlFlowMap({
        access: 'write',
        pack: mill?.pack || MILL_PACK,
        generation: mill?.generation || MILL_GENERATION,
      })}`,
    );
  }
  return lines;
}

export function toYaml(
  config: LandingConfig,
  vectorId: string,
  options?: LandingEmitOptions,
): string {
  const lines = [`# ${vectorId}`];
  const doc = toDocument(config, options);
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'coverageProfile') {
      lines.push(...yamlCoverageProfile(value as CoverageProfile));
      continue;
    }
    if (key === 'catalog' && value && typeof value === 'object' && !Array.isArray(value)) {
      const catalog = value as CatalogHref;
      lines.push(
        'catalog:',
        `  profile: ${yamlScalar(catalog.profile)}`,
        `  url: ${yamlScalar(catalog.url)}`,
      );
      continue;
    }
    if (key === 'cloud' && value && typeof value === 'object' && !Array.isArray(value)) {
      const cloud = value as CloudContract;
      lines.push(
        'cloud:',
        `  org: ${yamlScalar(cloud.org)}`,
        `  created: ${yamlScalar(cloud.created)}`,
        `  via: ${yamlScalar(cloud.via)}`,
      );
      if (cloud.login) {
        lines.push(`  login: ${yamlScalar(cloud.login)}`);
      }
      if (cloud.url) {
        lines.push(`  url: ${yamlScalar(cloud.url)}`);
      }
      if (cloud.pushed === true) {
        lines.push(`  pushed: ${yamlScalar(cloud.pushed)}`);
      }
      continue;
    }
    if (key === 'user' && value && typeof value === 'object' && !Array.isArray(value)) {
      const user = value as UserContract;
      lines.push(
        'user:',
        `  created: ${yamlScalar(user.created)}`,
        `  via: ${yamlScalar(user.via)}`,
      );
      if (user.login) {
        lines.push(`  login: ${yamlScalar(user.login)}`);
      }
      if (user.url) {
        lines.push(`  url: ${yamlScalar(user.url)}`);
      }
      if (user.pushed === true) {
        lines.push(`  pushed: ${yamlScalar(user.pushed)}`);
      }
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

export function toJson(
  config: LandingConfig,
  vectorId: string,
  options?: LandingEmitOptions,
): string {
  return JSON.stringify({ ...toDocument(config, options), vector: vectorId }, null, 2);
}

/** Dest zip dump of the Home form. Channel user/catalog/cloud stays off the assemble-zip POST. */
export function assembleZipYaml(
  config: LandingConfig,
  vectorId: string,
  options?: Pick<LandingEmitOptions, 'adoptDest'>,
): string {
  return toYaml({ ...config, destination: 'zip' }, vectorId, {
    adoptDest: options?.adoptDest,
  });
}

export function outputFilename(tab: OutputTabId): string {
  return tab === 'json' ? 'config.json' : 'config.yaml';
}

/** Registry `assemble-zip` bind (scripts/stands/registry.json). Loopback CORS fallback only. */
export const ASSEMBLE_ZIP_ORIGIN = 'http://127.0.0.1:3032';

export function assembleApiUrl(): string {
  return apiUrl('/assemble');
}

export function cloneApiUrl(): string {
  return apiUrl('/clone');
}

export function adoptApiUrl(): string {
  return apiUrl('/adopt');
}

export function adoptZipApiUrl(): string {
  return apiUrl('/adopt/zip');
}

/** Registry `adopt` bind. Loopback CORS fallback only. Not assemble-zip :3032. */
export const ADOPT_STAND_ORIGIN = 'http://127.0.0.1:3033';

export type AdoptResult = {
  ok: boolean;
  mode?: string;
  dest?: string;
  created?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

const PUBLIC_GITHUB = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/i;

export function isPublicGithubUrl(url: string): boolean {
  const text = url.trim();
  if (!text || /token=|pat=/i.test(text) || text.includes('@')) {
    return false;
  }
  return PUBLIC_GITHUB.test(text);
}

export function shouldAdoptLoopback(hostname: string): boolean {
  return isLoopbackHostname(hostname);
}

async function readAdoptJson(response: Response): Promise<AdoptResult | null> {
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/zip')) {
    return null;
  }
  try {
    const payload = (await response.json()) as AdoptResult;
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    if (!response.ok) {
      const error =
        typeof payload.error === 'string' && payload.error
          ? payload.error
          : typeof payload.message === 'string' && payload.message
            ? payload.message
            : 'adopt missing';
      return { ...payload, ok: false, error };
    }
    return payload;
  } catch {
    return null;
  }
}

export async function postAdoptUrl(
  url: string,
  api: string = adoptApiUrl(),
): Promise<AdoptResult | null> {
  if (!isPublicGithubUrl(url)) {
    return { ok: false, error: 'url must be public https://github.com/org/repo' };
  }
  try {
    const response = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
    return readAdoptJson(response);
  } catch {
    return null;
  }
}

export async function postAdoptPrivateUrl(
  url: string,
  api: string = githubOAuthAdoptUrl(),
): Promise<AdoptResult | null> {
  if (!isPublicGithubUrl(url)) {
    return { ok: false, error: 'url must be public https://github.com/org/repo' };
  }
  try {
    const response = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url: url.trim() }),
    });
    return readAdoptJson(response);
  } catch {
    return null;
  }
}

export async function postAdoptZip(
  file: File,
  api: string = adoptApiUrl(),
): Promise<AdoptResult | null> {
  const name = file.name.split(/[/\\]/).pop() ?? '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/i.test(name)) {
    return { ok: false, error: 'zip filename required' };
  }
  const body = new FormData();
  body.append('zip', file, name);
  try {
    const response = await fetch(api, { method: 'POST', body });
    return readAdoptJson(response);
  } catch {
    return null;
  }
}

export async function importAdopt(input: {
  url: string;
  file: File | null;
  hostname: string;
  origin?: string;
  apiUrl?: string;
  githubUser?: GithubUserSession | null;
}): Promise<AdoptResult | null> {
  const hasUrl = input.url.trim().length > 0;
  const hasZip = input.file != null;
  if (hasUrl === hasZip) {
    return { ok: false, error: 'one channel: url or zip' };
  }
  const privateUrl = Boolean(input.githubUser) && hasUrl;
  const api = input.apiUrl ?? (privateUrl ? githubOAuthAdoptUrl() : adoptApiUrl());
  const fallback =
    !privateUrl && shouldAdoptLoopback(input.hostname) && api === adoptApiUrl()
      ? `${input.origin ?? ADOPT_STAND_ORIGIN}/adopt`
      : null;
  const first = hasZip
    ? await postAdoptZip(input.file as File, api)
    : privateUrl
      ? await postAdoptPrivateUrl(input.url, api)
      : await postAdoptUrl(input.url, api);
  // Home 4xx is `{message}` (not `{error}`). Only loopback-fallback when fetch/parse failed.
  if (first != null) {
    return first;
  }
  if (!fallback) {
    return first;
  }
  return hasZip ? postAdoptZip(input.file as File, fallback) : postAdoptUrl(input.url, fallback);
}

export async function postAdoptDestZip(input: {
  dest: string;
  hostname: string;
  origin?: string;
  apiUrl?: string;
}): Promise<{ blob: Blob; filename: string } | null> {
  if (!isAdoptDest(input.dest)) {
    return null;
  }
  const dest = input.dest.trim();
  const api = input.apiUrl ?? adoptZipApiUrl();
  const fallback =
    shouldAdoptLoopback(input.hostname) && api === adoptZipApiUrl()
      ? `${input.origin ?? ADOPT_STAND_ORIGIN}/adopt/zip`
      : null;
  const first = await fetchAdoptDestZip(dest, api);
  if (first != null) {
    return first;
  }
  if (!fallback) {
    return null;
  }
  return fetchAdoptDestZip(dest, fallback);
}

async function fetchAdoptDestZip(
  dest: string,
  url: string,
): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dest }),
    });
    if (!response.ok) {
      return null;
    }
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('application/zip')) {
      return null;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      return null;
    }
    return {
      blob,
      filename: zipFilenameFromDisposition(
        response.headers.get('content-disposition'),
        'adopt.zip',
      ),
    };
  } catch {
    return null;
  }
}

export function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function shouldAssembleZip(destination: DestinationId): boolean {
  return destination === 'zip';
}

export function shouldAdoptDestZip(destination: DestinationId): boolean {
  return destination === 'zip';
}

const ADOPT_DEST = /^generated-projects\/adopt-[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isAdoptDest(dest: string): boolean {
  return ADOPT_DEST.test(dest.trim());
}

export function shouldAssembleZipLoopback(hostname: string): boolean {
  return isLoopbackHostname(hostname);
}

export function zipFilenameFromDisposition(
  header: string | null,
  fallback = 'assemble.zip',
): string {
  const match = /filename="([^"]+\.zip)"/i.exec(header ?? '');
  const name = match?.[1]?.trim();
  if (!name || name.includes('/') || name.includes('\\')) {
    return fallback;
  }
  return name;
}

export function copyText(contents: string): void {
  const clipboard = navigator.clipboard;
  if (!clipboard) {
    return;
  }
  void clipboard.writeText(contents);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export function downloadText(contents: string, filename: string): void {
  downloadBlob(new Blob([contents], { type: 'text/plain;charset=utf-8' }), filename);
}

export async function postAssembleZip(
  yaml: string,
  url: string = assembleApiUrl(),
): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    });
    if (!response.ok) {
      return null;
    }
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('application/zip')) {
      return null;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      return null;
    }
    return {
      blob,
      filename: zipFilenameFromDisposition(response.headers.get('content-disposition')),
    };
  } catch {
    return null;
  }
}

export async function postCloneZip(
  url: string = cloneApiUrl(),
): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      return null;
    }
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('application/zip')) {
      return null;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      return null;
    }
    return {
      blob,
      filename: zipFilenameFromDisposition(
        response.headers.get('content-disposition'),
        'clone-as-student.zip',
      ),
    };
  } catch {
    return null;
  }
}

export async function downloadCloneAsStudent(input: {
  hostname: string;
  origin?: string;
  apiUrl?: string;
}): Promise<'zip' | null> {
  const cloned =
    (await postCloneZip(input.apiUrl ?? cloneApiUrl())) ??
    (shouldAssembleZipLoopback(input.hostname)
      ? await postCloneZip(`${input.origin ?? ASSEMBLE_ZIP_ORIGIN}/clone`)
      : null);
  if (cloned) {
    downloadBlob(cloned.blob, cloned.filename);
    return 'zip';
  }
  return null;
}

export async function downloadLandingOutput(input: {
  destination: DestinationId;
  hostname: string;
  yaml: string;
  text: string;
  textFilename: string;
  origin?: string;
  catalogUrl?: string;
  githubUser?: GithubUserSession | null;
  landingConfig?: LandingConfig;
  vectorId?: string;
  outputTab?: OutputTabId;
  apiUrl?: string;
  idpSession?: IdpSession | null;
  adoptDest?: string | null;
}): Promise<'zip' | 'catalog' | 'text'> {
  if (input.destination === 'catalog') {
    openCatalogHref(input.catalogUrl ?? catalogHref(TAKEAWAY_TESTS_STACK));
    return 'catalog';
  }
  if (input.destination === 'cloud') {
    let output = input.text;
    if (input.idpSession && input.landingConfig && input.vectorId) {
      const yaml = assembleZipYaml(input.landingConfig, input.vectorId, {
        adoptDest: input.adoptDest,
      });
      const createdCloudRepo = await createCloudRepo({ yaml });
      const pushedCloudRepo = createdCloudRepo ? await pushCloudRepo({ yaml }) : null;
      const options = {
        idpSession: input.idpSession,
        createdCloudRepo,
        pushedCloudRepo,
        adoptDest: input.adoptDest,
      };
      output =
        input.outputTab === 'json'
          ? toJson(input.landingConfig, input.vectorId, options)
          : toYaml(input.landingConfig, input.vectorId, options);
    }
    downloadText(output, input.textFilename);
    return 'text';
  }
  if (input.destination === 'user') {
    let output = input.text;
    if (input.githubUser && input.landingConfig && input.vectorId) {
      const yaml = assembleZipYaml(input.landingConfig, input.vectorId, {
        adoptDest: input.adoptDest,
      });
      const createdRepo = await createGithubUserRepo({ yaml });
      const pushedRepo = createdRepo ? await pushGithubUserRepo({ yaml }) : null;
      const options = {
        githubUser: input.githubUser,
        createdRepo,
        pushedRepo,
        adoptDest: input.adoptDest,
      };
      output =
        input.outputTab === 'json'
          ? toJson(input.landingConfig, input.vectorId, options)
          : toYaml(input.landingConfig, input.vectorId, options);
    }
    downloadText(output, input.textFilename);
    return 'text';
  }
  const assembled =
    (await postAssembleZip(input.yaml, input.apiUrl ?? assembleApiUrl())) ??
    (shouldAssembleZipLoopback(input.hostname)
      ? await postAssembleZip(input.yaml, `${input.origin ?? ASSEMBLE_ZIP_ORIGIN}/assemble`)
      : null);
  if (assembled) {
    downloadBlob(assembled.blob, assembled.filename);
    return 'zip';
  }
  downloadText(input.text, input.textFilename);
  return 'text';
}
