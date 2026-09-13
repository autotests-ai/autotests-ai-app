import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { finishIdpCallback } from '../lib/idp-login';

/** Dest cloud callback. Does not exchange code or invent login this window. */
export function IdpCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    finishIdpCallback();
    navigate('/', { replace: true });
  }, [navigate]);

  return <main data-testid="idp-callback" />;
}
