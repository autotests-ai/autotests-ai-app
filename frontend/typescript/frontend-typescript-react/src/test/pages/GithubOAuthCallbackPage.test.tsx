import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GITHUB_OAUTH_STATE_KEY, GITHUB_USER_SESSION_KEY } from '../../lib/github-oauth';
import { GithubOAuthCallbackPage } from '../../pages/GithubOAuthCallbackPage';

describe('GithubOAuthCallbackPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('stores the GitHub login and returns home without a PAT', async () => {
    sessionStorage.setItem(GITHUB_OAUTH_STATE_KEY, 'csrf');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ login: 'octocat' }),
        } as Response),
      ),
    );
    const router = createMemoryRouter(
      [
        { path: '/', element: <div data-testid="home-after-oauth" /> },
        { path: '/oauth/github/callback', element: <GithubOAuthCallbackPage /> },
      ],
      { initialEntries: ['/oauth/github/callback?code=gh-code&state=csrf'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('github-oauth-callback')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('home-after-oauth')).toBeInTheDocument();
    });
    expect(JSON.parse(sessionStorage.getItem(GITHUB_USER_SESSION_KEY) ?? '{}')).toEqual({
      login: 'octocat',
    });
    expect(sessionStorage.getItem(GITHUB_OAUTH_STATE_KEY)).toBeNull();
  });

  it('returns home without a session when exchange fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network'))),
    );
    const router = createMemoryRouter(
      [
        { path: '/', element: <div data-testid="home-after-oauth" /> },
        { path: '/oauth/github/callback', element: <GithubOAuthCallbackPage /> },
      ],
      { initialEntries: ['/oauth/github/callback?error=access_denied'] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId('home-after-oauth')).toBeInTheDocument();
    });
    expect(sessionStorage.getItem(GITHUB_USER_SESSION_KEY)).toBeNull();
  });
});
