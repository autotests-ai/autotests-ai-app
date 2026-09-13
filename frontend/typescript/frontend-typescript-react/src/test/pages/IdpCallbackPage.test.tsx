import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDP_SESSION_KEY, IDP_STATE_KEY } from '../../lib/idp-login';
import { IdpCallbackPage } from '../../pages/IdpCallbackPage';

describe('IdpCallbackPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns home without inventing a login from the callback query', async () => {
    sessionStorage.setItem(IDP_STATE_KEY, 'csrf');
    const router = createMemoryRouter(
      [
        { path: '/', element: <div data-testid="home-after-idp" /> },
        { path: '/oauth/idp/callback', element: <IdpCallbackPage /> },
      ],
      { initialEntries: ['/oauth/idp/callback?code=idp-code&state=csrf&login=unknown'] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId('home-after-idp')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('idp-callback')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(IDP_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(IDP_STATE_KEY)).toBeNull();
  });
});
