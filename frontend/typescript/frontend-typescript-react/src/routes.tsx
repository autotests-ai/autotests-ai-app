import type { RouteObject } from 'react-router-dom';
import { App } from './App';
import { HomePage } from './pages/HomePage';

/**
 * Route objects rather than JSX `<Routes>`: the same array feeds
 * `createBrowserRouter` in `main.tsx` and `createMemoryRouter` in the tests.
 * Board `/stack/` is phase 2 — this scaffold only mounts Home.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [{ index: true, element: <HomePage /> }],
  },
];
