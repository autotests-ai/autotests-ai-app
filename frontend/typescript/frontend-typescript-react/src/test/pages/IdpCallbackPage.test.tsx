import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDP_SESSION_KEY, IDP_STATE_KEY } from '../../lib/idp-login';
import { IdpCallbackPage } from '../../pages/IdpCallbackPage';

describe('IdpCallbackPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('stores the school login and returns home without a token or query login', async () => {
    sessionStorage.setItem(IDP_STATE_KEY, 'csrf');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ login: 'qaguru' }),
        } as Response),
      ),
    );
    const router = createMemoryRouter(
      [
        { path: '/', element: <div data-testid="home-after-idp" /> },
        { path: '/oauth/idp/callback', element: <IdpCallbackPage /> },
      ],
      { initialEntries: ['/oauth/idp/callback?code=idp-code&state=csrf&login=unknown'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('idp-callback')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('home-after-idp')).toBeInTheDocument();
    });
    expect(JSON.parse(sessionStorage.getItem(IDP_SESSION_KEY) ?? '{}')).toEqual({
      login: 'qaguru',
    });
    expect(sessionStorage.getItem(IDP_SESSION_KEY)).not.toContain('token');
    expect(sessionStorage.getItem(IDP_STATE_KEY)).toBeNull();
  });

  it('returns home without a session when exchange fails', async () => {
    sessionStorage.setItem(IDP_STATE_KEY, 'csrf');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network'))),
    );
    const router = createMemoryRouter(
      [
        { path: '/', element: <div data-testid="home-after-idp" /> },
        { path: '/oauth/idp/callback', element: <IdpCallbackPage /> },
      ],
      { initialEntries: ['/oauth/idp/callback?error=access_denied'] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId('home-after-idp')).toBeInTheDocument();
    });
    expect(sessionStorage.getItem(IDP_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(IDP_STATE_KEY)).toBeNull();
  });
});
