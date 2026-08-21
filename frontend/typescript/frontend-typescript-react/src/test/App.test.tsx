import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { headerConfig, STACK_INDEX_HREF } from '../lib/headerConfig';
import { routes } from '../routes';

function renderApp(initialPath: string) {
  return render(
    <RouterProvider router={createMemoryRouter(routes, { initialEntries: [initialPath] })} />,
  );
}

describe('App', { tags: ['smoke'] }, () => {
  it('mounts the header slot and an empty page-shell on /', () => {
    renderApp('/');

    expect(screen.getByTestId('app-header-mount')).toBeInTheDocument();
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
    expect(screen.getByTestId('page-shell')).toHaveClass('page-shell');
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
