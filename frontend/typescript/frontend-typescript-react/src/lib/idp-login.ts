/** School IdP for dest cloud. Session is login only — never GitHub OAuth, never a PAT.
 * Token is an httpOnly cookie on /api/cloud. */

import { apiUrl } from './appBase';
import { e2eStackFromYaml, isGithubRepoName } from './github-oauth';

export const IDP_CALLBACK_PATH = '/oauth/idp/callback';
export const IDP_SESSION_KEY = 'autotests-ai.idp';
export const IDP_STATE_KEY = 'autotests-ai.idp-state';
export const IDP_SCOPE = 'openid';
const SECRET_KEYS = [
  'token',
  'access_token',
  'id_token',
  'pat',
  'password',
  'refresh_token',
] as const;

/** Person mark (viewBox 0 0 24 24). Not the GitHub octocat. */
export const IDP_MARK_PATH =
  'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-8.4 1.3-8.4 4.2v2.4h16.8v-2.4c0-2.9-5.2-4.2-8.4-4.2z';

const SCHOOL_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export type IdpSession = {
  login: string;
};

export type CloudCreatedRepo = {
  login: string;
  url: string;
  created: true;
};

export type IdpCallbackQuery = {
  code?: string;
  state?: string;
  error?: string;
};

/** Runtime assigner so RTL can spy without stubbing window.location. */
export const idpAssign = {
  go(url: string): void {
    window.location.assign(url);
  },
};

export const idpGate = {
  configured(env: IdpEnv = import.meta.env): boolean {
    return idpConfigured(env);
  },
};

type IdpEnv = {
  VITE_IDP_CLIENT_ID?: string;
  VITE_IDP_AUTHORIZE_URL?: string;
};

export function idpClientId(env: IdpEnv = import.meta.env): string {
  const id = env.VITE_IDP_CLIENT_ID;
  return typeof id === 'string' ? id.trim() : '';
}

export function idpAuthorizeUrl(env: IdpEnv = import.meta.env): string {
  const url = env.VITE_IDP_AUTHORIZE_URL;
  return typeof url === 'string' ? url.trim() : '';
}

export function idpConfigured(env: IdpEnv = import.meta.env): boolean {
  return Boolean(idpClientId(env) && isIdpAuthorizeUrl(idpAuthorizeUrl(env)));
}

/** Keycloak username = handle. Never `unknown`. */
export function isSchoolLogin(value: string): boolean {
  return SCHOOL_LOGIN_RE.test(value) && value.toLowerCase() !== 'unknown';
}

/** Authorize URL from env. Never GitHub login. */
export function isIdpAuthorizeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }
    const host = url.hostname.toLowerCase();
    if (host === 'github.com' || host.endsWith('.github.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function idpExchangeUrl(): string {
  return apiUrl('/oauth/idp');
}

export function idpCloudReposUrl(): string {
  return apiUrl('/cloud/repos');
}

export function idpRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}${IDP_CALLBACK_PATH}`;
}

export function idpAuthorizeHref(input: {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const url = new URL(input.authorizeUrl);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', input.scope ?? IDP_SCOPE);
  url.searchParams.set('state', input.state);
  return url.toString();
}

export function createIdpState(): string {
  return crypto.randomUUID();
}

export function writeIdpState(state: string, storage: Storage = sessionStorage): void {
  storage.setItem(IDP_STATE_KEY, state);
}

export function readIdpState(storage: Storage = sessionStorage): string | null {
  try {
    return storage.getItem(IDP_STATE_KEY);
  } catch {
    return null;
  }
}

export function clearIdpState(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(IDP_STATE_KEY);
  } catch {
    // private mode
  }
}

export function writeIdpSession(session: IdpSession, storage: Storage = sessionStorage): void {
  if (!isSchoolLogin(session.login)) {
    return;
  }
  storage.setItem(IDP_SESSION_KEY, JSON.stringify({ login: session.login }));
}

export function readIdpSession(storage: Storage = sessionStorage): IdpSession | null {
  try {
    const raw = storage.getItem(IDP_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { login?: unknown; token?: unknown };
    if (parsed.token != null && parsed.token !== '') {
      return null;
    }
    if (typeof parsed.login !== 'string' || !isSchoolLogin(parsed.login)) {
      return null;
    }
    return { login: parsed.login };
  } catch {
    return null;
  }
}

export function clearIdpSession(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(IDP_SESSION_KEY);
  } catch {
    // private mode
  }
}

/** Drop state after the callback. Never invent login from the query. */
export function finishIdpCallback(storage: Storage = sessionStorage): void {
  clearIdpState(storage);
}

export function parseIdpCallback(search: string): IdpCallbackQuery {
  const trimmed = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(trimmed);
  const error = params.get('error')?.trim() || undefined;
  const code = params.get('code')?.trim() || undefined;
  const state = params.get('state')?.trim() || undefined;
  return { code, state, error };
}

function payloadHasSecret(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  const rec = body as Record<string, unknown>;
  return SECRET_KEYS.some((key) => rec[key] != null && rec[key] !== '');
}

function loginFromExchangeBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }
  const login = (body as { login?: unknown }).login;
  return typeof login === 'string' ? login : undefined;
}

export async function completeIdpCallback(input: {
  search: string;
  fetchImpl?: typeof fetch;
  storage?: Storage;
  exchangeUrl?: string;
  origin?: string;
}): Promise<IdpSession> {
  const storage = input.storage ?? sessionStorage;
  const parsed = parseIdpCallback(input.search);
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  if (!parsed.code) {
    throw new Error('missing oauth code');
  }
  const expected = readIdpState(storage);
  if (!parsed.state || parsed.state !== expected) {
    throw new Error('oauth state mismatch');
  }
  const origin = input.origin ?? window.location.origin;
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(input.exchangeUrl ?? idpExchangeUrl(), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      code: parsed.code,
      state: parsed.state,
      redirectUri: idpRedirectUri(origin),
    }),
  });
  if (!response.ok) {
    throw new Error('oauth exchange failed');
  }
  const body: unknown = await response.json();
  if (payloadHasSecret(body)) {
    throw new Error('oauth must not return a token');
  }
  const login = loginFromExchangeBody(body);
  if (!login || !isSchoolLogin(login)) {
    throw new Error('oauth login missing');
  }
  const session = { login };
  writeIdpSession(session, storage);
  clearIdpState(storage);
  return session;
}

export function startIdpLogin(input: {
  clientId: string;
  authorizeUrl: string;
  origin: string;
  state?: string;
  storage?: Storage;
  assign?: (url: string) => void;
}): void {
  const clientId = input.clientId.trim();
  const authorizeUrl = input.authorizeUrl.trim();
  if (!clientId) {
    throw new Error('idp client id required');
  }
  if (!isIdpAuthorizeUrl(authorizeUrl)) {
    throw new Error('idp authorize url required');
  }
  const state = input.state ?? createIdpState();
  writeIdpState(state, input.storage);
  const url = idpAuthorizeHref({
    authorizeUrl,
    clientId,
    redirectUri: idpRedirectUri(input.origin),
    state,
  });
  const assign = input.assign ?? ((href) => idpAssign.go(href));
  assign(url);
}

/** Dest cloud repo named {idp-login}-{e2e.stack} in autotests-cloud. Never dest user. */
export function cloudRepoName(login: string, stack: string): string {
  if (!isSchoolLogin(login) || !isGithubRepoName(stack)) {
    return '';
  }
  return `${login}-${stack}`;
}

export function cloudRepoUrl(login: string, stack: string): string {
  const name = cloudRepoName(login, stack);
  if (!name) {
    return '';
  }
  return `https://github.com/autotests-cloud/${name}`;
}

export function isCloudRepoUrl(login: string, url: string): boolean {
  if (!isSchoolLogin(login) || !url) {
    return false;
  }
  const prefix = `https://github.com/autotests-cloud/${login}-`;
  if (!url.startsWith(prefix)) {
    return false;
  }
  return isGithubRepoName(url.slice(prefix.length));
}

export async function createCloudRepo(
  input: { yaml?: string; fetchImpl?: typeof fetch; reposUrl?: string } = {},
): Promise<CloudCreatedRepo | null> {
  const yaml = typeof input.yaml === 'string' ? input.yaml : '';
  const stack = e2eStackFromYaml(yaml);
  if (!stack) {
    return null;
  }
  try {
    const fetchImpl = input.fetchImpl ?? fetch;
    const response = await fetchImpl(input.reposUrl ?? idpCloudReposUrl(), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/yaml' },
      credentials: 'include',
      body: yaml,
    });
    if (!response.ok) {
      return null;
    }
    const body: unknown = await response.json();
    if (payloadHasSecret(body)) {
      return null;
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return null;
    }
    const rec = body as { login?: unknown; url?: unknown; created?: unknown; pushed?: unknown };
    if (rec.created !== true) {
      return null;
    }
    if (rec.pushed != null) {
      return null;
    }
    if (typeof rec.login !== 'string' || !isSchoolLogin(rec.login)) {
      return null;
    }
    if (typeof rec.url !== 'string' || rec.url !== cloudRepoUrl(rec.login, stack)) {
      return null;
    }
    return { login: rec.login, url: rec.url, created: true };
  } catch {
    return null;
  }
}
