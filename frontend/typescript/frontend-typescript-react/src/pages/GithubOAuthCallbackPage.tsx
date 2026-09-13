import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completeGithubOAuthCallback } from '../lib/github-oauth';

/** Thin GitHub OAuth callback. Stores login only, never a PAT. */
export function GithubOAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const search = params.toString();

  useEffect(() => {
    void completeGithubOAuthCallback({ search: `?${search}` })
      .catch(() => undefined)
      .finally(() => {
        navigate('/', { replace: true });
      });
  }, [navigate, search]);

  return <main data-testid="github-oauth-callback" />;
}
