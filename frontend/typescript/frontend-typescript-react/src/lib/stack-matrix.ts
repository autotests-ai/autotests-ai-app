/**
 * Stack matrix URL helpers for the landing `/stack/` board.
 * Data: public/stack/matrix.json ← python frontend/scripts/sync-stack-matrix.py
 * (teaching clone; writes this landing file).
 */

/** Canonical URL prefix — https://autotests.ai/stack/{backend}/{frontend}/ */
export const STACK_PREFIX = '/stack';

/** CI / deploy defaults — used when the URL has no pair yet (open links still work). */
export const DEFAULT_STACK_BACKEND = 'backend-java-spring';
export const DEFAULT_STACK_FRONTEND = 'frontend-typescript-react';

/** Effective pair for stack hrefs when only one side is selected in the URL. */
export function effectiveStackPair(
  backendId: string | null,
  frontendId: string | null,
): { backendId: string; frontendId: string } {
  return {
    backendId: backendId || DEFAULT_STACK_BACKEND,
    frontendId: frontendId || DEFAULT_STACK_FRONTEND,
  };
}

const PATH_RE = /^\/stack\/(backend-[^/]+)\/(frontend-[^/]+)/;

/** Nested product repo on GitHub — tree URLs for matrix `module` paths. */
export const GITHUB_TREE_BASE =
  'https://github.com/autotests-ai/autotests-ai-multistack-app/tree/main';

/** Octocat mark path (viewBox 0 0 24 24) — same as product header. */
export const GITHUB_MARK_PATH =
  'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z';

export type ModuleStatus = 'active' | 'slot' | 'stub' | 'derived' | string;

export interface BackendModule {
  id: string;
  status?: ModuleStatus;
  language?: string;
  module?: string;
}

export interface FrontendModule {
  id: string;
  status?: ModuleStatus;
  kind?: string;
  module?: string;
}

export interface TestsModule {
  id: string;
  status?: ModuleStatus;
  language?: string;
  module?: string;
  layers?: string[];
  /** Hub mill `in_stack: true` — 4th Tests-board crystal row. `false` omits it. */
  in_stack?: boolean;
  role?: string;
}

export interface StackMatrix {
  /** deploy/matrix.yaml `public_host` — Stage/Prod header fallback on loopback. */
  public_host?: string;
  backends: BackendModule[];
  frontends: FrontendModule[];
  tests?: TestsModule[];
}

export interface MountPair {
  backendId: string | null;
  frontendId: string | null;
}

export function parseMount(pathname: string): MountPair {
  const match = pathname.match(PATH_RE);
  if (match) {
    return { backendId: match[1], frontendId: match[2] };
  }
  const fe = pathname.match(/^\/stack\/(frontend-[^/]+)/);
  return {
    backendId: null,
    frontendId: fe ? fe[1] : null,
  };
}

export function parseTestsId(search: string = window.location.search): string | null {
  try {
    return new URLSearchParams(search).get('tests');
  } catch {
    return null;
  }
}

export function isOpenable(status: ModuleStatus | undefined): boolean {
  return status === 'active' || status === 'stub';
}

export function comboHref(backendId: string | null, frontendId: string | null, path = '/'): string {
  let p = path == null || path === '' ? '/' : String(path);
  if (!p.startsWith('/')) p = `/${p}`;
  const pair = effectiveStackPair(backendId, frontendId);
  return `${STACK_PREFIX}/${pair.backendId}/${pair.frontendId}${p === '/' ? '/' : p}`;
}

export function stackHref(
  backendId: string | null,
  frontendId: string | null,
  testsId: string | null = null,
): string {
  const base = comboHref(backendId, frontendId, '/');
  if (!testsId) return base;
  return `${base}?tests=${encodeURIComponent(testsId)}`;
}

function queryId(params: URLSearchParams, key: string, prefix: string): string | null {
  const value = params.get(key);
  return value?.startsWith(prefix) ? value : null;
}

export interface StackSelection extends MountPair {
  hub: boolean;
}

/** `?backend=` / `?frontend=` on the bare `/stack/` board (does not collide with app URLs). */
export function parseStackQuery(search = ''): MountPair {
  try {
    const raw = String(search || '');
    const params = new URLSearchParams(raw.replace(/^\?/, '') ? raw : '');
    return {
      backendId: queryId(params, 'backend', 'backend-'),
      frontendId: queryId(params, 'frontend', 'frontend-'),
    };
  } catch {
    return { backendId: null, frontendId: null };
  }
}

/**
 * Hub (`/stack/`) has no pair in the path — select via query, defaulting to the CI pair.
 * In-app `/stack/{backend}/{frontend}/…` keeps the path pair.
 */
export function resolveSelection(pathname: string, search = ''): StackSelection {
  const fromPath = parseMount(pathname);
  const hub = !fromPath.backendId && !fromPath.frontendId;
  if (hub) {
    const fromQuery = parseStackQuery(search);
    const pair = effectiveStackPair(fromQuery.backendId, fromQuery.frontendId);
    return { hub: true, backendId: pair.backendId, frontendId: pair.frontendId };
  }
  return { hub: false, backendId: fromPath.backendId, frontendId: fromPath.frontendId };
}

/** Stay on the `/stack/` board while picking a pair (and optional tests module). */
export function stackBoardHref(
  backendId: string | null,
  frontendId: string | null,
  testsId: string | null = null,
): string {
  const pair = effectiveStackPair(backendId, frontendId);
  const params = new URLSearchParams();
  params.set('backend', pair.backendId);
  params.set('frontend', pair.frontendId);
  if (testsId) params.set('tests', testsId);
  return `${STACK_PREFIX}/?${params.toString()}`;
}

/** GitHub folder for a matrix module path (`backend/python/...`). */
export function githubModuleHref(modulePath: string | null | undefined): string | null {
  if (!modulePath) return null;
  const cleaned = String(modulePath).replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleaned || cleaned.includes('..')) return null;
  return `${GITHUB_TREE_BASE}/${cleaned}`;
}

/** Swagger UI for a teaching backend — `/stack/{backend}/api/docs`. */
export function apiDocsHref(backendId: string | null | undefined): string | null {
  if (!backendId) return null;
  const id = String(backendId);
  if (!id.startsWith('backend-') || /[/?#]/.test(id) || id.includes('..')) return null;
  return `${STACK_PREFIX}/${id}/api/docs`;
}

/** Latest merged Allure 3 awesome report (GitHub Pages). */
export const ALLURE_AWESOME_LATEST =
  'https://reports.autotests.ai/reports/latest/awesome/index.html';

/**
 * Awesome `?query=` token. Plugin search-index indexes a label allowlist
 * (owner/suite/package/…) and **omits** `module` / `layer`, so matrix ids do
 * not match Java results. Use strings that actually appear in fullName/package:
 * frontend id prefix, Java/Kotlin `dev.multistack.app` (excludes tests.api / tests.e2e).
 */
export function allureSearchQuery(
  moduleId: string | null | undefined,
  options?: { language?: string },
): string | null {
  if (!moduleId) return null;
  const id = String(moduleId);
  if (!id.startsWith('backend-') && !id.startsWith('frontend-')) return null;
  if (/[/?#]/.test(id) || id.includes('..')) return null;
  if (id.startsWith('frontend-')) return id;
  const language = options?.language;
  if (language === 'java' || language === 'kotlin') return 'dev.multistack.app';
  return id;
}

/**
 * Awesome tree filtered to in-module tests (backend: unit + integration, not e2e;
 * frontend: component).
 */
export function allureQueryHref(query: string | null | undefined): string | null {
  if (!query) return null;
  const q = String(query);
  if (!q || /[/?#]/.test(q) || q.includes('..')) return null;
  return `${ALLURE_AWESOME_LATEST}?query=${encodeURIComponent(q)}`;
}

export function allureModuleHref(
  moduleId: string | null | undefined,
  options?: { language?: string },
): string | null {
  return allureQueryHref(allureSearchQuery(moduleId, options));
}

/**
 * Tests-column suites live under `tests.<layer>…` packages (Java/Kotlin).
 * `tests` matches both api and e2e; a single layer uses `tests.api` / `tests.e2e`.
 */
export function allureTestsSearchQuery(item: TestsModule | null | undefined): string | null {
  if (!item?.id) return null;
  const id = String(item.id);
  if (!id.startsWith('tests-') || /[/?#]/.test(id) || id.includes('..')) return null;
  if (item.language === 'java' || item.language === 'kotlin') {
    const layers = item.layers || [];
    const hasApi = layers.includes('api');
    const hasE2e = layers.includes('e2e');
    if (hasApi && !hasE2e) return 'tests.api';
    if (hasE2e && !hasApi) return 'tests.e2e';
    return 'tests';
  }
  return id;
}

export function allureTestsHref(item: TestsModule | null | undefined): string | null {
  return allureQueryHref(allureTestsSearchQuery(item));
}

export function findModuleById(
  items: Array<{ id: string; module?: string }>,
  id: string | null,
): string | null {
  if (!id) return null;
  return items.find((item) => item.id === id)?.module ?? null;
}

export function findById<T extends { id: string }>(
  items: T[] | undefined,
  id: string | null,
): T | null {
  if (!id || !items) return null;
  return items.find((item) => item.id === id) ?? null;
}

/** Pyramid layers hosted in the backend test tree (not tests/<lang>/). */
export const UNIT_ROW_LAYERS: string[] = ['unit', 'integration'];

/** Pyramid layer hosted in a SPA frontend test tree. */
export const COMPONENT_ROW_LAYERS: string[] = ['component'];

/**
 * 4th Tests-board column: IR mill (`layers: [crystal]`). Shown when hub `in_stack: true`.
 * Not mixed into the api/e2e list — not a Selenide/PW peer.
 */
export const CRYSTAL_ROW_LAYERS: string[] = ['crystal'];

function isCrystalMill(item: TestsModule): boolean {
  return CRYSTAL_ROW_LAYERS.some((layer) => (item.layers || []).includes(layer));
}

function isTestsBoardRow(item: TestsModule): boolean {
  if (item.in_stack === false) return false;
  return !isCrystalMill(item);
}

/** Pinned crystal mill (`tests-go-cdp`) when the hub asked for the /stack/ column. */
export function crystalMill(data: StackMatrix): TestsModule | null {
  const mills = (data.tests ?? []).filter((item) => item.in_stack === true && isCrystalMill(item));
  return mills.find((item) => item.id === 'tests-go-cdp') ?? mills[0] ?? null;
}

/** IR JSON for the mill — not Go page objects. */
export function crystalTestsPath(item: TestsModule | null): string | null {
  if (!item?.module) return null;
  return `${item.module}/crystals`;
}

/** Meta under crystal row — mill caption (path is the Module label). */
export function crystalTestsMeta(item: TestsModule | null): string {
  if (!item) return 'IR mill';
  return 'greedy run';
}

/** Unit tests live inside the selected backend module (not under tests/). */
export function unitTestsPath(backend: BackendModule | null): string | null {
  if (!backend?.module) return null;
  if (backend.language === 'python') return `${backend.module}/tests`;
  return `${backend.module}/src/test`;
}

/** Canonical RTL teaching path (Vitest + React Testing Library). */
export const COMPONENT_RTL_PATH = 'frontend/typescript/frontend-typescript-react/src/test';

/**
 * Local component suite for a frontend row. Static FE has no in-module tests —
 * do not fall back to another module (that belongs on the Tests board).
 */
export function localComponentTestsPath(frontend: FrontendModule | null): string | null {
  if (!frontend?.module || frontend.kind === 'static') return null;
  return `${frontend.module}/src/test`;
}

/**
 * Component / RTL tests — selected React FE `src/test`, else canonical
 * frontend-typescript-react RTL (static FE has no local component suite).
 */
export function componentTestsPath(frontend: FrontendModule | null): string {
  return localComponentTestsPath(frontend) || COMPONENT_RTL_PATH;
}

/** Short label for Module column (`frontend-typescript-react/src/test`). */
export function shortModuleLabel(path: string | null | undefined): string {
  if (!path) return '';
  return String(path)
    .replace(/^frontend\/(?:javascript|typescript)\//, '')
    .replace(/^backend\/(?:java|kotlin|python|go)\//, '')
    .replace(/^tests\/(?:java|kotlin|python|go|javascript|typescript)\//, '');
}

/** Meta under unit row — framework caption (path is the Module label). */
export function unitTestsMeta(backend: BackendModule | null): string {
  if (!backend) return 'pick a backend';
  if (backend.language === 'python') return 'pytest';
  if (backend.language === 'java' || backend.language === 'kotlin') return 'junit5';
  if (backend.language === 'go') return 'testing';
  return backend.language || 'unit';
}

/** Meta under component row — library caption (path is the Module label). */
export function componentTestsMeta(path: string | null | undefined): string {
  if (!path) return 'pick a frontend';
  if (path.includes('react') || path === COMPONENT_RTL_PATH) {
    return 'react-testing-library';
  }
  return shortModuleLabel(path);
}

export function resolveTestsId(data: StackMatrix, requested: string | null): string | null {
  const tests = (data.tests ?? []).filter(isTestsBoardRow);
  if (requested && tests.some((t) => t.id === requested)) return requested;
  const active = tests.filter((t) => isOpenable(t.status || 'active'));
  const withApi = active.find((t) => (t.layers || []).includes('api'));
  return (withApi || active[0] || tests[0])?.id ?? null;
}

export function summarizeMatrix(data: StackMatrix) {
  return {
    backends: data.backends ?? [],
    frontends: data.frontends ?? [],
    tests: (data.tests ?? []).filter(isTestsBoardRow),
    crystal: crystalMill(data),
  };
}

/** Fetch public matrix artifact under the product /stack/ mount. */
export async function fetchStackMatrix(matrixUrl: string): Promise<StackMatrix> {
  const res = await fetch(matrixUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<StackMatrix>;
}

/** Hub row click — same as the live overlay (`location.assign`). */
export function assignLocation(href: string): void {
  window.location.assign(href);
}
