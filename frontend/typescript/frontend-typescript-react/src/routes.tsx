import type { RouteObject } from 'react-router-dom';
import { App } from './App';
import { GithubOAuthCallbackPage } from './pages/GithubOAuthCallbackPage';
import { HomePage } from './pages/HomePage';
import { IdpCallbackPage } from './pages/IdpCallbackPage';
import { StackPage } from './pages/StackPage';

/**
 * Route objects rather than JSX `<Routes>`: the same array feeds
 * `createBrowserRouter` in `main.tsx` and `createMemoryRouter` in the tests.
 * Board is `/stack` / `/stack/`. Splat is a fallback when a cell URL hits this
 * SPA (local gateway, stale landing SW) — prod nginx still owns the cells.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'oauth/github/callback', element: <GithubOAuthCallbackPage /> },
      { path: 'oauth/idp/callback', element: <IdpCallbackPage /> },
      { path: 'stack', element: <StackPage /> },
      { path: 'stack/*', element: <StackPage /> },
    ],
  },
];
