import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADER_LANG_CHANGE, ru } from '../../i18n';
import type { StackMatrix } from '../../lib/stack-matrix';
import * as stackMatrix from '../../lib/stack-matrix';
import { StackPage } from '../../pages/StackPage';

const { bindStackHeaderPoll } = vi.hoisted(() => ({
  bindStackHeaderPoll: vi.fn<(onTick: () => void) => () => void>(() => () => {}),
}));

vi.mock('../../lib/header-poll', () => ({
  bindStackHeaderPoll,
}));

const MATRIX: StackMatrix = {
  public_host: 'autotests.ai',
  backends: [
    {
      id: 'backend-java-spring',
      status: 'active',
      language: 'java',
      module: 'backend/java/backend-java-spring',
    },
    {
      id: 'backend-python-flask',
      status: 'active',
      language: 'python',
      module: 'backend/python/backend-python-flask',
    },
    { id: 'backend-go-slot', status: 'slot' },
    { id: 'backend-no-meta' },
  ],
  frontends: [
    {
      id: 'frontend-typescript-react',
      status: 'active',
      kind: 'spa',
      module: 'frontend/typescript/frontend-typescript-react',
    },
    {
      id: 'frontend-javascript-vue',
      status: 'active',
      module: 'frontend/javascript/frontend-javascript-vue',
    },
    { id: 'frontend-slot', status: 'slot' },
  ],
  tests: [
    {
      id: 'tests-java-gradle-junit5-allure3-selenide',
      status: 'active',
      language: 'java',
      module: 'tests/java/tests-java-gradle-junit5-allure3-selenide',
      layers: ['api', 'e2e'],
    },
    {
      id: 'tests-java-gradle-junit5-allure3-selenium',
      status: 'slot',
      language: 'java',
      module: 'tests/java/tests-java-gradle-junit5-allure3-selenium',
      layers: ['e2e'],
    },
    { id: 'tests-no-layers', status: 'stub' },
    { id: 'tests-bare' },
    { id: 'tests-slot', status: 'slot' },
    {
      id: 'tests-go-cdp',
      status: 'slot',
      language: 'go',
      module: 'tests/go/tests-go-cdp',
      layers: ['crystal'],
      in_stack: true,
    },
  ],
};

function jsonOk(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StackPage />
    </MemoryRouter>,
  );
}

describe('StackPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    bindStackHeaderPoll.mockReturnValue(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonOk(MATRIX)),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('shows the loading state then the live board', async () => {
    renderAt('/stack/');
    expect(screen.getByTestId('stack-loading')).toHaveTextContent('Loading matrix');
    expect(screen.getByTestId('stack-page')).toHaveClass('stack-page');

    await waitFor(() => {
      expect(screen.getByTestId('stack-current-pair')).toHaveTextContent(
        'backend-java-spring · frontend-typescript-react',
      );
    });
    expect(screen.getByTestId('stack-backend-backend-java-spring')).toHaveAttribute(
      'href',
      '/stack/?backend=backend-java-spring&frontend=frontend-typescript-react&tests=tests-java-gradle-junit5-allure3-selenide',
    );
    expect(screen.getByTestId('stack-tests-board')).toBeInTheDocument();
    expect(screen.getByTestId('stack-tests-unit')).toHaveTextContent(
      'backend-java-spring/src/test',
    );
    expect(screen.getByTestId('stack-tests-component')).toHaveTextContent(
      'frontend-typescript-react/src/test',
    );
    expect(screen.getByTestId('stack-gh-backend-backend-java-spring')).toHaveAttribute(
      'href',
      'https://github.com/autotests-ai/autotests-ai-multistack-app/tree/main/backend/java/backend-java-spring',
    );
    expect(screen.getByTestId('stack-api-backend-java-spring')).toHaveAttribute(
      'href',
      '/stack/backend-java-spring/api/docs',
    );
    expect(screen.getByTestId('stack-api-backend-java-spring')).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('stack-api-backend-python-flask')).toHaveAttribute(
      'href',
      '/stack/backend-python-flask/api/docs',
    );
    expect(screen.queryByTestId('stack-api-backend-go-slot')).not.toBeInTheDocument();
    expect(screen.getByTestId('stack-tests-src-backend-backend-java-spring')).toHaveAttribute(
      'href',
      'https://github.com/autotests-ai/autotests-ai-multistack-app/tree/main/backend/java/backend-java-spring/src/test',
    );
    expect(screen.getByTestId('stack-allure-backend-backend-java-spring')).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=dev.multistack.app',
    );
    expect(
      screen.getByTestId('stack-tests-src-frontend-frontend-typescript-react'),
    ).toHaveAttribute(
      'href',
      'https://github.com/autotests-ai/autotests-ai-multistack-app/tree/main/frontend/typescript/frontend-typescript-react/src/test',
    );
    expect(screen.getByTestId('stack-allure-frontend-frontend-typescript-react')).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=frontend-typescript-react',
    );
    expect(screen.getByTestId('stack-allure-tests-unit')).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=dev.multistack.app',
    );
    expect(screen.getByTestId('stack-allure-tests-component')).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=frontend-typescript-react',
    );
    expect(
      screen.getByTestId('stack-allure-tests-tests-java-gradle-junit5-allure3-selenide'),
    ).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=tests',
    );
    expect(
      screen.getByTestId('stack-allure-tests-tests-java-gradle-junit5-allure3-selenium'),
    ).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=tests.e2e',
    );
    expect(screen.queryByTestId('stack-allure-tests-tests-slot')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stack-allure-tests-tests-no-layers')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stack-tests-tests-go-cdp')).not.toBeInTheDocument();
    expect(screen.getByTestId('stack-tests-crystal')).toHaveTextContent('tests-go-cdp/crystals');
    expect(screen.getByTestId('stack-gh-tests-crystal')).toHaveAttribute(
      'href',
      'https://github.com/autotests-ai/autotests-ai-multistack-app/tree/main/tests/go/tests-go-cdp/crystals',
    );
    expect(screen.queryByTestId('stack-allure-tests-crystal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stack-tests-src-backend-backend-go-slot')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stack-allure-backend-backend-go-slot')).not.toBeInTheDocument();
    expect(
      screen
        .getByTestId('stack-backend-backend-java-spring')
        .closest('table')
        ?.querySelector('.stack-page__open'),
    ).toBeNull();
    expect(bindStackHeaderPoll).toHaveBeenCalled();
  });

  it('renders an error when matrix.json cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          Promise.resolve({ ok: false, status: 404, json: async () => ({}) }) as Promise<Response>,
      ),
    );
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-error')).toHaveTextContent('HTTP 404');
    });
  });

  it('does not apply a late fetch after unmount', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const view = renderAt('/stack/');
    view.unmount();
    resolveFetch(await jsonOk(MATRIX));
    await Promise.resolve();
  });

  it('does not apply a late error after unmount', async () => {
    let rejectFetch: (reason: Error) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectFetch = reject;
          }),
      ),
    );
    const view = renderAt('/stack/');
    view.unmount();
    rejectFetch(new Error('HTTP 500'));
    await Promise.resolve();
  });

  it('keeps hub selection on query params and fills open hrefs', async () => {
    renderAt(
      '/stack/?backend=backend-python-flask&frontend=frontend-javascript-vue&tests=tests-no-layers',
    );
    await waitFor(() => {
      expect(screen.getByTestId('stack-current-pair')).toHaveTextContent(
        'backend-python-flask · frontend-javascript-vue · tests-no-layers',
      );
    });
    expect(screen.getByTestId('stack-frontend-frontend-javascript-vue')).toHaveAttribute(
      'href',
      '/stack/?backend=backend-python-flask&frontend=frontend-javascript-vue&tests=tests-no-layers',
    );
    expect(screen.getByTestId('stack-tests-tests-no-layers').closest('tr')).toHaveClass(
      'stack-page__row--active',
    );
    expect(screen.getByTestId('stack-backend-backend-go-slot').tagName).toBe('SPAN');
    expect(screen.getByTestId('stack-frontend-frontend-slot').tagName).toBe('SPAN');
    expect(screen.getByTestId('stack-tests-tests-slot').tagName).toBe('SPAN');
  });

  it('shows a slot unit row when the selected backend has no module', async () => {
    renderAt('/stack/?backend=backend-go-slot&frontend=frontend-slot&tests=tests-slot');
    await waitFor(() => {
      expect(screen.getByTestId('stack-tests-unit').tagName).toBe('SPAN');
    });
    expect(screen.getByTestId('stack-tests-unit')).toHaveTextContent('unit');
    expect(screen.queryByTestId('stack-allure-tests-unit')).not.toBeInTheDocument();
    expect(screen.getByTestId('stack-allure-tests-component')).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=frontend-typescript-react',
    );
    expect(screen.getByTestId('stack-tests-tests-slot')).toHaveClass('is-active');
    expect(screen.getByTestId('stack-backend-backend-go-slot')).toHaveClass('is-active');
    expect(screen.getByTestId('stack-frontend-frontend-slot')).toHaveClass('is-active');
  });

  it('assigns a tests hub row outside the select link', async () => {
    const assign = vi.spyOn(stackMatrix, 'assignLocation').mockImplementation(() => {});
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-tests-tests-no-layers')).toBeInTheDocument();
    });
    screen.getByTestId('stack-tests-tests-no-layers').closest('tr')?.click();
    expect(assign).toHaveBeenCalledWith(
      '/stack/?backend=backend-java-spring&frontend=frontend-typescript-react&tests=tests-no-layers',
    );
    assign.mockRestore();
  });

  it('assigns a frontend hub row outside the module link', async () => {
    const assign = vi.spyOn(stackMatrix, 'assignLocation').mockImplementation(() => {});
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-frontend-frontend-javascript-vue')).toBeInTheDocument();
    });
    screen.getByTestId('stack-frontend-frontend-javascript-vue').closest('tr')?.click();
    expect(assign).toHaveBeenCalledWith(
      '/stack/?backend=backend-java-spring&frontend=frontend-javascript-vue&tests=tests-java-gradle-junit5-allure3-selenide',
    );
    screen.getByTestId('stack-frontend-frontend-javascript-vue').click();
    expect(assign).toHaveBeenCalledTimes(1);
    assign.mockRestore();
  });

  it('uses cell hrefs off the hub and labels a frontend-only path', async () => {
    renderAt('/stack/frontend-javascript-vue/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-current-pair')).toHaveTextContent(
        '(no backend prefix) · frontend-javascript-vue',
      );
    });
    expect(screen.getByTestId('stack-frontend-frontend-javascript-vue')).toHaveAttribute(
      'href',
      '/stack/backend-java-spring/frontend-javascript-vue/',
    );
    expect(
      screen.getByTestId('stack-tests-tests-java-gradle-junit5-allure3-selenide'),
    ).toHaveAttribute(
      'href',
      '/stack/backend-java-spring/frontend-javascript-vue/?tests=tests-java-gradle-junit5-allure3-selenide',
    );
    expect(screen.getByTestId('stack-allure-tests-component')).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=frontend-javascript-vue',
    );
  });

  it('uses path pair hrefs off the hub', async () => {
    renderAt('/stack/backend-python-flask/frontend-typescript-react/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-current-pair')).toHaveTextContent(
        'backend-python-flask · frontend-typescript-react',
      );
    });
    expect(screen.getByTestId('stack-backend-backend-python-flask')).toHaveAttribute(
      'href',
      '/stack/backend-python-flask/frontend-typescript-react/',
    );
    expect(screen.getByTestId('stack-tests-unit')).toHaveTextContent('backend-python-flask/tests');
    expect(screen.getByTestId('stack-allure-tests-unit')).toHaveAttribute(
      'href',
      'https://reports.autotests.ai/reports/latest/awesome/index.html?query=backend-python-flask',
    );
  });

  it('assigns the hub row when the row is clicked outside a link', async () => {
    const assign = vi.spyOn(stackMatrix, 'assignLocation').mockImplementation(() => {});
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-backend-backend-python-flask')).toBeInTheDocument();
    });
    screen.getByTestId('stack-backend-backend-python-flask').closest('tr')?.click();
    expect(assign).toHaveBeenCalledWith(
      '/stack/?backend=backend-python-flask&frontend=frontend-typescript-react&tests=tests-java-gradle-junit5-allure3-selenide',
    );
    assign.mockRestore();
  });

  it('ignores hub row clicks that target a link', async () => {
    const assign = vi.spyOn(stackMatrix, 'assignLocation').mockImplementation(() => {});
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-backend-backend-python-flask')).toBeInTheDocument();
    });
    screen.getByTestId('stack-backend-backend-python-flask').click();
    expect(assign).not.toHaveBeenCalled();
    screen.getByTestId('stack-api-backend-python-flask').click();
    expect(assign).not.toHaveBeenCalled();
    screen.getByTestId('stack-tests-src-backend-backend-python-flask').click();
    expect(assign).not.toHaveBeenCalled();
    screen.getByTestId('stack-allure-backend-backend-python-flask').click();
    expect(assign).not.toHaveBeenCalled();
    screen.getByTestId('stack-allure-tests-unit').click();
    expect(assign).not.toHaveBeenCalled();
    assign.mockRestore();
  });

  it('hides the crystal mill when in_stack is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonOk({
          ...MATRIX,
          tests: (MATRIX.tests ?? []).map((item) =>
            item.id === 'tests-go-cdp' ? { ...item, in_stack: false } : item,
          ),
        }),
      ),
    );
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-tests-board')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('stack-tests-crystal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stack-tests-tests-go-cdp')).not.toBeInTheDocument();
  });

  it('shows a disabled crystal row when the mill has no module path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonOk({
          ...MATRIX,
          tests: (MATRIX.tests ?? []).map((item) =>
            item.id === 'tests-go-cdp' ? { ...item, module: undefined } : item,
          ),
        }),
      ),
    );
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-tests-crystal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('stack-tests-crystal').tagName).toBe('SPAN');
    expect(screen.getByTestId('stack-tests-crystal')).toHaveClass('stack-page__id--disabled');
  });

  it('polls by reusing the header tick callback', async () => {
    let onTick: (() => void) | undefined;
    bindStackHeaderPoll.mockImplementation((tick: () => void) => {
      onTick = tick;
      return () => {};
    });
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-current-pair')).toBeInTheDocument();
    });
    expect(typeof onTick).toBe('function');
    await act(async () => {
      onTick?.();
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('switches chrome to RU and keeps matrix ids and hrefs in English', async () => {
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-backend-title')).toHaveTextContent('Backend');
    });
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('stack-page')).toBeInTheDocument();
    expect(screen.getByTestId('stack-backend-backend-java-spring')).toHaveTextContent(
      'backend-java-spring',
    );
    expect(
      screen.getByTestId('stack-tests-src-backend-backend-java-spring').getAttribute('title'),
    ).toContain('unit · integration');

    act(() => {
      document.dispatchEvent(new CustomEvent(HEADER_LANG_CHANGE, { detail: { lang: 'ru' } }));
    });

    expect(document.documentElement.lang).toBe('ru');
    expect(screen.getByTestId('stack-backend-title')).toHaveTextContent(ru.stack.panelBackend);
    expect(screen.getByTestId('stack-frontend-title')).toHaveTextContent(ru.stack.panelFrontend);
    expect(screen.getByTestId('stack-tests-title')).toHaveTextContent(ru.stack.panelTests);
    expect(screen.queryByTestId('stack-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('stack-backend-backend-java-spring')).toHaveTextContent(
      'backend-java-spring',
    );
    expect(screen.getByTestId('stack-frontend-frontend-typescript-react')).toHaveTextContent(
      'frontend-typescript-react',
    );
    expect(screen.getByTestId('stack-backend-backend-java-spring')).toHaveAttribute(
      'href',
      '/stack/?backend=backend-java-spring&frontend=frontend-typescript-react&tests=tests-java-gradle-junit5-allure3-selenide',
    );
    expect(
      screen.getByTestId('stack-tests-src-backend-backend-java-spring').getAttribute('title'),
    ).toContain('unit · integration');
    expect(screen.getAllByText('active').length).toBeGreaterThan(0);
  });

  it('starts from stored ru without translating status or layers', async () => {
    localStorage.setItem('zds-lang', 'ru');
    renderAt('/stack/');
    await waitFor(() => {
      expect(screen.getByTestId('stack-backend-title')).toHaveTextContent(ru.stack.panelBackend);
    });
    expect(document.documentElement.lang).toBe('ru');
    expect(screen.getByTestId('stack-page')).toBeInTheDocument();
    expect(
      screen.getByTestId('stack-tests-tests-java-gradle-junit5-allure3-selenide'),
    ).toHaveTextContent('tests-java-gradle-junit5-allure3-selenide');
    expect(screen.getAllByText('slot').length).toBeGreaterThan(0);
  });
});
