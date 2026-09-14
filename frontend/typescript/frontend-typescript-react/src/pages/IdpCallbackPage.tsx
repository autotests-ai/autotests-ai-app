import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completeIdpCallback, finishIdpCallback } from '../lib/idp-login';

/** Dest cloud callback. Exchanges code for login cookie. Never a token in JSON, never login from the query. */
export function IdpCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const search = params.toString();

  useEffect(() => {
    void completeIdpCallback({ search: `?${search}` })
      .catch(() => undefined)
      .finally(() => {
        finishIdpCallback();
        navigate('/', { replace: true });
      });
  }, [navigate, search]);

  return <main data-testid="idp-callback" />;
}
