import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { headerConfig, STACK_INDEX_HREF } from '../lib/headerConfig';
import { routes } from '../routes';

function renderApp(initialPath: string) {
  return render(
    <RouterProvider router={createMemoryRouter(routes, { initialEntries: [initialPath] })} />,
  );
}

describe('App', { tags: ['smoke'] }, () => {
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
    vi.unstubAllGlobals();
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
});
