import { describe, expect, it, vi } from 'vitest';
import {
  ALLURE_AWESOME_LATEST,
  allureModuleHref,
  allureQueryHref,
  allureSearchQuery,
  allureTestsHref,
  allureTestsSearchQuery,
  apiDocsHref,
  assignLocation,
  COMPONENT_ROW_LAYERS,
  COMPONENT_RTL_PATH,
  CRYSTAL_ROW_LAYERS,
  comboHref,
  componentTestsMeta,
  componentTestsPath,
  crystalMill,
  crystalTestsMeta,
  crystalTestsPath,
  DEFAULT_STACK_BACKEND,
  DEFAULT_STACK_FRONTEND,
  effectiveStackPair,
  fetchStackMatrix,
  findById,
  findModuleById,
  GITHUB_TREE_BASE,
  githubModuleHref,
  isOpenable,
  localComponentTestsPath,
  PERFORMANCE_ROW_LAYERS,
  parseMount,
  parseStackQuery,
  parseTestsId,
  performanceModules,
  performanceTestsMeta,
  performanceToolLabel,
  resolveSelection,
  resolveTestsId,
  STACK_PREFIX,
  type StackMatrix,
  shortModuleLabel,
  stackBoardHref,
  stackHref,
  summarizeMatrix,
  unitTestsMeta,
  unitTestsPath,
} from '../../lib/stack-matrix';

describe('stack-matrix selection', () => {
  it('treats bare /stack/ as the hub and fills the CI default pair', () => {
    expect(resolveSelection('/stack/', '')).toEqual({
      hub: true,
      backendId: 'backend-java-spring',
      frontendId: 'frontend-typescript-react',
    });
  });

  it('reads hub selection from query params', () => {
    expect(
      parseStackQuery('?backend=backend-python-flask&frontend=frontend-javascript-vue'),
    ).toEqual({
      backendId: 'backend-python-flask',
      frontendId: 'frontend-javascript-vue',
    });
    expect(
      resolveSelection('/stack/', '?backend=backend-python-flask&frontend=frontend-javascript-vue'),
    ).toEqual({
      hub: true,
      backendId: 'backend-python-flask',
      frontendId: 'frontend-javascript-vue',
    });
  });

  it('keeps the path pair off the hub', () => {
    expect(resolveSelection('/stack/backend-kotlin-spring/frontend-typescript-vue/', '')).toEqual({
      hub: false,
      backendId: 'backend-kotlin-spring',
      frontendId: 'frontend-typescript-vue',
    });
  });

  it('builds a board href that stays on /stack/', () => {
    expect(stackBoardHref('backend-python-flask', 'frontend-javascript-vue')).toBe(
      '/stack/?backend=backend-python-flask&frontend=frontend-javascript-vue',
    );
  });

  it('never emits a bare /stack/login — fills the CI default pair', () => {
    expect(comboHref(null, null, '/login')).toBe(
      '/stack/backend-java-spring/frontend-typescript-react/login',
    );
    expect(comboHref(null, null, '/')).toBe(
      '/stack/backend-java-spring/frontend-typescript-react/',
    );
  });
});

describe('stack-matrix helpers', () => {
  it('fills the effective pair and prefix', () => {
    expect(STACK_PREFIX).toBe('/stack');
    expect(effectiveStackPair(null, null)).toEqual({
      backendId: DEFAULT_STACK_BACKEND,
      frontendId: DEFAULT_STACK_FRONTEND,
    });
    expect(effectiveStackPair('backend-go-gin', 'frontend-javascript-vue')).toEqual({
      backendId: 'backend-go-gin',
      frontendId: 'frontend-javascript-vue',
    });
  });

  it('parses mount paths including frontend-only', () => {
    expect(parseMount('/stack/backend-java-spring/frontend-typescript-react/login')).toEqual({
      backendId: 'backend-java-spring',
      frontendId: 'frontend-typescript-react',
    });
    expect(parseMount('/stack/frontend-javascript-vue/')).toEqual({
      backendId: null,
      frontendId: 'frontend-javascript-vue',
    });
    expect(parseMount('/stack/')).toEqual({ backendId: null, frontendId: null });
  });

  it('reads tests from search and ignores invalid query ids', () => {
    expect(parseTestsId('?tests=tests-java-gradle-junit5-allure3-selenide')).toBe(
      'tests-java-gradle-junit5-allure3-selenide',
    );
    expect(parseTestsId('')).toBe(null);
    expect(parseTestsId()).toBe(new URLSearchParams(window.location.search).get('tests'));
    expect(parseStackQuery('')).toEqual({ backendId: null, frontendId: null });
    expect(parseStackQuery('backend=nope&frontend=nope')).toEqual({
      backendId: null,
      frontendId: null,
    });
  });

  it('returns empty ids when URLSearchParams throws', () => {
    const original = globalThis.URLSearchParams;
    globalThis.URLSearchParams = class {
      constructor() {
        throw new Error('boom');
      }
    } as unknown as typeof URLSearchParams;
    try {
      expect(parseTestsId('?tests=x')).toBe(null);
      expect(parseStackQuery('?backend=backend-java-spring')).toEqual({
        backendId: null,
        frontendId: null,
      });
    } finally {
      globalThis.URLSearchParams = original;
    }
  });

  it('opens active and stub modules only', () => {
    expect(isOpenable('active')).toBe(true);
    expect(isOpenable('stub')).toBe(true);
    expect(isOpenable('slot')).toBe(false);
    expect(isOpenable(undefined)).toBe(false);
  });

  it('normalizes combo and stack hrefs', () => {
    expect(comboHref('backend-go-gin', 'frontend-javascript-vue', '')).toBe(
      '/stack/backend-go-gin/frontend-javascript-vue/',
    );
    expect(comboHref('backend-go-gin', 'frontend-javascript-vue', null as unknown as string)).toBe(
      '/stack/backend-go-gin/frontend-javascript-vue/',
    );
    expect(comboHref('backend-go-gin', 'frontend-javascript-vue', 'notes')).toBe(
      '/stack/backend-go-gin/frontend-javascript-vue/notes',
    );
    expect(stackHref('backend-go-gin', 'frontend-javascript-vue')).toBe(
      '/stack/backend-go-gin/frontend-javascript-vue/',
    );
    expect(stackHref('backend-go-gin', 'frontend-javascript-vue', 'tests-python-selenium')).toBe(
      '/stack/backend-go-gin/frontend-javascript-vue/?tests=tests-python-selenium',
    );
    expect(
      stackBoardHref('backend-go-gin', 'frontend-javascript-vue', 'tests-python-selenium'),
    ).toBe(
      '/stack/?backend=backend-go-gin&frontend=frontend-javascript-vue&tests=tests-python-selenium',
    );
  });

  it('builds GitHub module hrefs and looks up rows', () => {
    expect(githubModuleHref(null)).toBe(null);
    expect(githubModuleHref('')).toBe(null);
    expect(githubModuleHref('../secret')).toBe(null);
    expect(githubModuleHref('/backend/java/backend-java-spring/')).toBe(
      `${GITHUB_TREE_BASE}/backend/java/backend-java-spring`,
    );
    const items = [
      { id: 'backend-java-spring', module: 'backend/java/backend-java-spring' },
      { id: 'backend-empty' },
    ];
    expect(findModuleById(items, null)).toBe(null);
    expect(findModuleById(items, 'missing')).toBe(null);
    expect(findModuleById(items, 'backend-java-spring')).toBe('backend/java/backend-java-spring');
    expect(findById(items, null)).toBe(null);
    expect(findById(undefined, 'backend-java-spring')).toBe(null);
    expect(findById(items, 'backend-java-spring')?.id).toBe('backend-java-spring');
    expect(findById(items, 'missing')).toBe(null);
  });

  it('builds Swagger UI hrefs per backend id', () => {
    expect(apiDocsHref(null)).toBe(null);
    expect(apiDocsHref('')).toBe(null);
    expect(apiDocsHref('frontend-typescript-react')).toBe(null);
    expect(apiDocsHref('backend-java-spring/../x')).toBe(null);
    expect(apiDocsHref('backend-java-spring?x=1')).toBe(null);
    expect(apiDocsHref('backend-python-flask')).toBe('/stack/backend-python-flask/api/docs');
  });

  it('builds Allure awesome hrefs filtered by searchable tokens', () => {
    expect(ALLURE_AWESOME_LATEST).toContain('reports.autotests.ai');
    expect(allureModuleHref(null)).toBe(null);
    expect(allureModuleHref('')).toBe(null);
    expect(allureModuleHref('tests-java-gradle-junit5-allure3-selenide')).toBe(null);
    expect(allureModuleHref('backend-java-spring?x=1')).toBe(null);
    expect(allureSearchQuery('backend-java-spring', { language: 'java' })).toBe(
      'dev.multistack.app',
    );
    expect(allureModuleHref('backend-java-spring', { language: 'java' })).toBe(
      `${ALLURE_AWESOME_LATEST}?query=dev.multistack.app`,
    );
    expect(allureModuleHref('backend-python-flask', { language: 'python' })).toBe(
      `${ALLURE_AWESOME_LATEST}?query=backend-python-flask`,
    );
    expect(allureModuleHref('frontend-typescript-react')).toBe(
      `${ALLURE_AWESOME_LATEST}?query=frontend-typescript-react`,
    );
    expect(allureQueryHref('ok/nope')).toBe(null);
    expect(allureQueryHref('..')).toBe(null);
    expect(COMPONENT_ROW_LAYERS).toEqual(['component']);
    expect(CRYSTAL_ROW_LAYERS).toEqual(['crystal']);
    expect(PERFORMANCE_ROW_LAYERS).toEqual(['performance']);
  });

  it('builds Allure hrefs for tests-column suites', () => {
    expect(allureTestsSearchQuery(null)).toBe(null);
    expect(allureTestsSearchQuery({ id: 'backend-java-spring' })).toBe(null);
    expect(allureTestsSearchQuery({ id: 'tests-java-x?x=1', language: 'java' })).toBe(null);
    expect(allureTestsSearchQuery({ id: 'tests-java-x/../y', language: 'java' })).toBe(null);
    expect(
      allureTestsSearchQuery({
        id: 'tests-java-gradle-junit5-allure3-selenide',
        language: 'java',
        layers: ['api', 'e2e'],
      }),
    ).toBe('tests');
    expect(
      allureTestsSearchQuery({
        id: 'tests-java-gradle-junit5-allure3-restassured',
        language: 'java',
        layers: ['api'],
      }),
    ).toBe('tests.api');
    expect(
      allureTestsSearchQuery({
        id: 'tests-java-gradle-junit5-allure3-selenium',
        language: 'java',
        layers: ['e2e'],
      }),
    ).toBe('tests.e2e');
    expect(allureTestsSearchQuery({ id: 'tests-java-empty', language: 'java' })).toBe('tests');
    expect(
      allureTestsSearchQuery({ id: 'tests-kotlin-x', language: 'kotlin', layers: ['e2e'] }),
    ).toBe('tests.e2e');
    expect(allureTestsSearchQuery({ id: 'tests-python-pytest', language: 'python' })).toBe(
      'tests-python-pytest',
    );
    expect(
      allureTestsHref({
        id: 'tests-java-gradle-junit5-allure3-selenide',
        language: 'java',
        layers: ['api', 'e2e'],
      }),
    ).toBe(`${ALLURE_AWESOME_LATEST}?query=tests`);
    expect(
      allureTestsHref({
        id: 'tests-java-gradle-junit5-allure3-selenium',
        language: 'java',
        layers: ['e2e'],
      }),
    ).toBe(`${ALLURE_AWESOME_LATEST}?query=tests.e2e`);
  });

  it('derives unit and component test paths', () => {
    expect(unitTestsPath(null)).toBe(null);
    expect(unitTestsPath({ id: 'backend-x' })).toBe(null);
    expect(
      unitTestsPath({
        id: 'backend-python-flask',
        language: 'python',
        module: 'backend/python/backend-python-flask',
      }),
    ).toBe('backend/python/backend-python-flask/tests');
    expect(
      unitTestsPath({
        id: 'backend-java-spring',
        language: 'java',
        module: 'backend/java/backend-java-spring',
      }),
    ).toBe('backend/java/backend-java-spring/src/test');
    expect(
      componentTestsPath({
        id: 'frontend-typescript-react',
        kind: 'spa',
        module: 'frontend/typescript/frontend-typescript-react',
      }),
    ).toBe('frontend/typescript/frontend-typescript-react/src/test');
    expect(
      componentTestsPath({
        id: 'frontend-javascript-vue',
        kind: 'spa',
        module: 'frontend/javascript/frontend-javascript-vue',
      }),
    ).toBe('frontend/javascript/frontend-javascript-vue/src/test');
    expect(
      componentTestsPath({
        id: 'frontend-javascript-vanilla',
        kind: 'static',
        module: 'frontend/javascript/frontend-javascript-vanilla',
      }),
    ).toBe(COMPONENT_RTL_PATH);
    expect(
      localComponentTestsPath({
        id: 'frontend-javascript-vanilla',
        kind: 'static',
        module: 'frontend/javascript/frontend-javascript-vanilla',
      }),
    ).toBe(null);
    expect(localComponentTestsPath(null)).toBe(null);
    expect(componentTestsPath(null)).toBe(COMPONENT_RTL_PATH);
    expect(
      componentTestsPath({
        id: '',
        kind: 'spa',
        module: 'frontend/javascript/frontend-javascript-vue',
      }),
    ).toBe('frontend/javascript/frontend-javascript-vue/src/test');
  });

  it('labels modules and test meta', () => {
    expect(shortModuleLabel(null)).toBe('');
    expect(shortModuleLabel('frontend/typescript/frontend-typescript-react/src/test')).toBe(
      'frontend-typescript-react/src/test',
    );
    expect(shortModuleLabel('backend/java/backend-java-spring/src/test')).toBe(
      'backend-java-spring/src/test',
    );
    expect(shortModuleLabel('tests/go/tests-go-cdp/crystals')).toBe('tests-go-cdp/crystals');
    expect(shortModuleLabel('tests/scala/tests-scala-gatling')).toBe('tests-scala-gatling');
    expect(shortModuleLabel('tests/groovy/tests-groovy-jmeter')).toBe('tests-groovy-jmeter');
    expect(shortModuleLabel('tests/csharp/tests-csharp-nunit-allure3-selenium')).toBe(
      'tests-csharp-nunit-allure3-selenium',
    );
    expect(unitTestsMeta(null)).toBe('pick a backend');
    expect(unitTestsMeta({ id: 'b', language: 'python' })).toBe('pytest');
    expect(unitTestsMeta({ id: 'b', language: 'java' })).toBe('junit5');
    expect(unitTestsMeta({ id: 'b', language: 'kotlin' })).toBe('junit5');
    expect(unitTestsMeta({ id: 'b', language: 'go' })).toBe('testing');
    expect(unitTestsMeta({ id: 'b', language: 'javascript' })).toBe('javascript');
    expect(unitTestsMeta({ id: 'b' })).toBe('unit');
    expect(componentTestsMeta(null)).toBe('pick a frontend');
    expect(componentTestsMeta(COMPONENT_RTL_PATH)).toBe('react-testing-library');
    expect(componentTestsMeta('frontend/javascript/frontend-javascript-vue/src/test')).toBe(
      'frontend-javascript-vue/src/test',
    );
  });

  it('resolves tests id and summarizes a matrix', () => {
    const data: StackMatrix = {
      backends: [],
      frontends: [],
      tests: [
        { id: 'tests-slot', status: 'slot', layers: ['e2e'] },
        { id: 'tests-e2e', status: 'active', layers: ['e2e'] },
        { id: 'tests-api', status: 'active', layers: ['api', 'e2e'] },
      ],
    };
    expect(resolveTestsId(data, 'tests-e2e')).toBe('tests-e2e');
    expect(resolveTestsId(data, 'missing')).toBe('tests-api');
    expect(resolveTestsId({ backends: [], frontends: [] }, null)).toBe(null);
    expect(resolveTestsId({ backends: [], frontends: [], tests: [] }, null)).toBe(null);
    expect(
      resolveTestsId({ backends: [], frontends: [], tests: [{ id: 'implicit-active' }] }, null),
    ).toBe('implicit-active');
    expect(
      resolveTestsId(
        {
          backends: [],
          frontends: [],
          tests: [{ id: 'e2e-only', status: 'active', layers: ['e2e'] }],
        },
        null,
      ),
    ).toBe('e2e-only');
    expect(
      resolveTestsId(
        { backends: [], frontends: [], tests: [{ id: 'only-slot', status: 'slot' }] },
        null,
      ),
    ).toBe('only-slot');
    expect(summarizeMatrix({ backends: [], frontends: [] })).toEqual({
      backends: [],
      frontends: [],
      tests: [],
      crystal: null,
      performance: [],
    });
    expect(
      summarizeMatrix({
        backends: undefined as unknown as StackMatrix['backends'],
        frontends: undefined as unknown as StackMatrix['frontends'],
        tests: undefined,
      }),
    ).toEqual({ backends: [], frontends: [], tests: [], crystal: null, performance: [] });
    expect(
      summarizeMatrix({
        backends: [],
        frontends: [],
        tests: [
          { id: 'tests-java-gradle-junit5-allure3-selenide', layers: ['api', 'e2e'] },
          { id: 'tests-go-cdp', layers: ['crystal'], in_stack: false },
          { id: 'tests-go-cdp-sync-leak', layers: ['crystal'] },
          { id: 'tests-java-jmeter', layers: ['performance'] },
        ],
      }).tests.map((t) => t.id),
    ).toEqual(['tests-java-gradle-junit5-allure3-selenide']);
    expect(
      summarizeMatrix({
        backends: [],
        frontends: [],
        tests: [
          { id: 'tests-java-gradle-junit5-allure3-selenide', layers: ['api', 'e2e'] },
          {
            id: 'tests-go-cdp',
            status: 'slot',
            module: 'tests/go/tests-go-cdp',
            layers: ['crystal'],
            in_stack: true,
          },
          { id: 'tests-go-cdp-sync-leak', layers: ['crystal'] },
          {
            id: 'tests-java-jmeter',
            status: 'slot',
            module: 'tests/java/tests-java-jmeter',
            layers: ['performance'],
          },
          { id: 'tests-python-locust', layers: ['performance'], in_stack: false },
        ],
      }),
    ).toEqual({
      backends: [],
      frontends: [],
      tests: [{ id: 'tests-java-gradle-junit5-allure3-selenide', layers: ['api', 'e2e'] }],
      crystal: {
        id: 'tests-go-cdp',
        status: 'slot',
        module: 'tests/go/tests-go-cdp',
        layers: ['crystal'],
        in_stack: true,
      },
      performance: [
        {
          id: 'tests-java-jmeter',
          status: 'slot',
          module: 'tests/java/tests-java-jmeter',
          layers: ['performance'],
        },
      ],
    });
    expect(
      crystalMill({
        backends: [],
        frontends: [],
        tests: [{ id: 'tests-go-cdp', layers: ['crystal'], in_stack: false }],
      }),
    ).toBe(null);
    expect(crystalTestsPath(null)).toBe(null);
    expect(
      crystalTestsPath({
        id: 'tests-go-cdp',
        module: 'tests/go/tests-go-cdp',
        layers: ['crystal'],
        in_stack: true,
      }),
    ).toBe('tests/go/tests-go-cdp/crystals');
    expect(crystalTestsMeta(null)).toBe('IR mill');
    expect(crystalTestsMeta({ id: 'tests-go-cdp', layers: ['crystal'] })).toBe('greedy run');
    expect(
      resolveTestsId(
        {
          backends: [],
          frontends: [],
          tests: [
            { id: 'tests-go-cdp', layers: ['crystal'], in_stack: false },
            { id: 'tests-javascript-playwright', status: 'active', layers: ['api', 'e2e'] },
          ],
        },
        'tests-go-cdp',
      ),
    ).toBe('tests-javascript-playwright');
    expect(
      resolveTestsId(
        {
          backends: [],
          frontends: [],
          tests: [
            { id: 'tests-go-cdp', status: 'slot', layers: CRYSTAL_ROW_LAYERS },
            { id: 'tests-typescript-playwright', status: 'active', layers: ['api', 'e2e'] },
          ],
        },
        'tests-go-cdp',
      ),
    ).toBe('tests-typescript-playwright');
    expect(
      resolveTestsId(
        {
          backends: [],
          frontends: [],
          tests: [
            { id: 'tests-go-cdp', status: 'slot', layers: CRYSTAL_ROW_LAYERS, in_stack: true },
            { id: 'tests-typescript-playwright', status: 'active', layers: ['api', 'e2e'] },
          ],
        },
        'tests-go-cdp',
      ),
    ).toBe('tests-typescript-playwright');
    expect(
      resolveTestsId(
        {
          backends: [],
          frontends: [],
          tests: [
            { id: 'tests-java-jmeter', status: 'slot', layers: PERFORMANCE_ROW_LAYERS },
            { id: 'tests-typescript-playwright', status: 'active', layers: ['api', 'e2e'] },
          ],
        },
        'tests-java-jmeter',
      ),
    ).toBe('tests-typescript-playwright');
    expect(
      performanceModules({
        backends: [],
        frontends: [],
        tests: [
          { id: 'tests-java-jmeter', layers: ['performance'] },
          { id: 'tests-python-locust', layers: ['performance'], in_stack: false },
          { id: 'tests-java-selenide', layers: ['api', 'e2e'] },
        ],
      }).map((item) => item.id),
    ).toEqual(['tests-java-jmeter']);
    expect(performanceToolLabel({ id: 'tests-java-jmeter' })).toBe('jmeter');
    expect(performanceToolLabel({ id: 'tests-python-yandex_tank' })).toBe('yandex-tank');
    expect(performanceToolLabel({ id: '' })).toBe('load');
    expect(
      performanceTestsMeta({
        id: 'tests-java-jmeter',
        language: 'java',
        status: 'slot',
        layers: ['performance'],
      }),
    ).toBe('java · jmeter · slot');
    expect(performanceTestsMeta({ id: 'tests-javascript-k6' })).toBe('tests · k6 · slot');
  });

  it('fetches matrix.json and throws on HTTP errors', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backends: [], frontends: [] }),
    });
    await expect(fetchStackMatrix('/stack/matrix.json')).resolves.toEqual({
      backends: [],
      frontends: [],
    });
    expect(fetchMock).toHaveBeenCalledWith('/stack/matrix.json', { cache: 'no-store' });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(fetchStackMatrix('/stack/matrix.json')).rejects.toThrow('HTTP 404');
    vi.unstubAllGlobals();
  });

  it('assigns window.location', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    assignLocation('/stack/?backend=backend-java-spring&frontend=frontend-typescript-react');
    expect(assign).toHaveBeenCalledWith(
      '/stack/?backend=backend-java-spring&frontend=frontend-typescript-react',
    );
    vi.unstubAllGlobals();
  });
});
