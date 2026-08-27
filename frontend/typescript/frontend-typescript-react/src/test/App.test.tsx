import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADER_LANG_CHANGE, ru } from '../i18n';
import { buildHeaderConfig, headerConfig, STACK_INDEX_HREF } from '../lib/headerConfig';
import { routes } from '../routes';

function dispatchLang(lang: string) {
  act(() => {
    document.dispatchEvent(new CustomEvent(HEADER_LANG_CHANGE, { detail: { lang } }));
  });
}

function renderApp(initialPath: string) {
  return render(
    <RouterProvider router={createMemoryRouter(routes, { initialEntries: [initialPath] })} />,
  );
}

describe('App', { tags: ['smoke'] }, () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    window.headerConfig = buildHeaderConfig('en');
    window.__designSystemRemountHeader = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.headerConfig;
    delete window.__designSystemRemountHeader;
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('mounts the header slot and configurator on /', () => {
    renderApp('/');

    expect(screen.getByTestId('app-header-mount')).toBeInTheDocument();
    expect(screen.getByTestId('page-shell')).toHaveClass('page-shell', 'configurator');
    expect(screen.getByTestId('landing-configurator')).toHaveClass(
      'configurator__layout--terminal',
    );
    expect(screen.getByTestId('landing-terminal-output')).toHaveTextContent('headless: false');
  });

  it('mounts the stack board on /stack/', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ backends: [], frontends: [], tests: [] }),
        } as Response),
      ),
    );
    renderApp('/stack/');
    expect(screen.getByTestId('app-header-mount')).toBeInTheDocument();
    expect(screen.getByTestId('stack-page')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('stack-loading')).not.toBeInTheDocument();
    });
  });

  it('keeps the stack board on a cell URL instead of the router 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ backends: [], frontends: [], tests: [] }),
        } as Response),
      ),
    );
    renderApp('/stack/backend-java-spring/frontend-typescript-react/');
    expect(screen.getByTestId('app-header-mount')).toBeInTheDocument();
    expect(screen.getByTestId('stack-page')).toBeInTheDocument();
    expect(screen.queryByText(/404 Not Found/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('stack-loading')).not.toBeInTheDocument();
    });
  });

  it('exposes Home + Stack + Stage/Prod without login on apex', () => {
    expect(STACK_INDEX_HREF).toBe('/stack/');
    expect(headerConfig.nav?.map((item) => item.testid)).toEqual([
      'header-nav-home',
      'header-nav-stack',
      'header-nav-stage',
      'header-nav-prod',
    ]);
  });

  it('remounts header nav once when language changes', async () => {
    const remount = window.__designSystemRemountHeader as ReturnType<typeof vi.fn>;
    renderApp('/');

    expect(screen.getByTestId('landing-stack-title')).toHaveTextContent('Stack');
    dispatchLang('ru');
    expect(screen.getByTestId('landing-stack-title')).toHaveTextContent(ru.home.panelStack);
    await waitFor(() => expect(remount).toHaveBeenCalledTimes(1));

    dispatchLang('ru');
    expect(remount).toHaveBeenCalledTimes(1);
  });
});
