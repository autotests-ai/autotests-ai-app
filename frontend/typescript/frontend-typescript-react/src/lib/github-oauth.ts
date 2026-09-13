/** GitHub OAuth for dest user. Session is login only — never a PAT. Token is an httpOnly cookie. */

import { apiUrl } from './appBase';

export const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
export const GITHUB_OAUTH_CALLBACK_PATH = '/oauth/github/callback';
export const GITHUB_OAUTH_SCOPE = 'public_repo';
export const GITHUB_USER_SESSION_KEY = 'autotests-ai.github-user';
export const GITHUB_OAUTH_STATE_KEY = 'autotests-ai.github-oauth-state';

const GITHUB_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const GITHUB_REPO_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const E2E_LINE = /^([ \t]*)e2e:\s*(.*)$/;
const FLOW_STACK = /\bstack:\s*([A-Za-z0-9][A-Za-z0-9._-]*)/;
const STACK_LINE = /^[ \t]*stack:\s*(\S+)\s*$/;
const SECRET_KEYS = ['token', 'access_token', 'pat', 'password', 'refresh_token'] as const;

export type GithubUserSession = {
  login: string;
};

export type GithubCreatedRepo = {
  login: string;
  url: string;
  created: true;
};

export type GithubPushedRepo = {
  login: string;
  url: string;
  pushed: true;
};

export type GithubOAuthCallbackQuery = {
  code?: string;
  state?: string;
  error?: string;
};

/** Runtime assigner so RTL can spy without stubbing window.location. */
export const githubOAuthAssign = {
  go(url: string): void {
    window.location.assign(url);
  },
};

type GithubOAuthEnv = {
  VITE_GITHUB_OAUTH_CLIENT_ID?: string;
};

export function githubOAuthClientId(env: GithubOAuthEnv = import.meta.env): string {
  const id = env.VITE_GITHUB_OAUTH_CLIENT_ID;
  return typeof id === 'string' ? id.trim() : '';
}

export function githubOAuthExchangeUrl(): string {
  return apiUrl('/oauth/github');
}

export function githubOAuthReposUrl(): string {
  return apiUrl('/oauth/github/repos');
}

export function githubOAuthContentsUrl(): string {
  return apiUrl('/oauth/github/repos/contents');
}

export function githubOAuthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}${GITHUB_OAUTH_CALLBACK_PATH}`;
}

export function isGithubLogin(value: string): boolean {
  return GITHUB_LOGIN_RE.test(value) && value.toLowerCase() !== 'unknown';
}

export function isGithubRepoName(value: string): boolean {
  return GITHUB_REPO_RE.test(value);
}

/** coverageProfile.automation.e2e.stack from YAML Home. Never a frozen stack. */
export function e2eStackFromYaml(yaml: string): string {
  if (!yaml.trim()) {
    return '';
  }
  let found: string | undefined;
  let e2eIndent = -1;
  for (const line of yaml.split(/\r?\n/)) {
    const e2e = E2E_LINE.exec(line);
    if (e2e) {
      const rest = e2e[2].trim();
      e2eIndent = e2e[1].length;
      if (rest.startsWith('{')) {
        const flow = FLOW_STACK.exec(rest);
        found = flow?.[1];
        break;
      }
      continue;
    }
    if (e2eIndent < 0) {
      continue;
    }
    if (!line.trim()) {
      continue;
    }
    const indent = (/^[ \t]*/.exec(line) as RegExpExecArray)[0].length;
    if (indent <= e2eIndent) {
      break;
    }
    const stack = STACK_LINE.exec(line);
    if (stack) {
      found = stack[1];
      break;
    }
  }
  return found && isGithubRepoName(found) ? found : '';
}

/** Real profile URL only. Never github.com/unknown. */
export function githubUserUrl(login: string): string {
  if (!isGithubLogin(login)) {
    return '';
  }
  return `https://github.com/${login}`;
}

/** Dest user repo named from YAML e2e.stack. Never org or unknown. */
export function githubUserRepoUrl(login: string, repo: string): string {
  if (!isGithubLogin(login) || !isGithubRepoName(repo)) {
    return '';
  }
  return `https://github.com/${login}/${repo}`;
}

export function isGithubUserRepoUrl(login: string, url: string): boolean {
  if (!isGithubLogin(login) || !url) {
    return false;
  }
  const prefix = `https://github.com/${login}/`;
  if (!url.startsWith(prefix)) {
    return false;
  }
  return isGithubRepoName(url.slice(prefix.length));
}

export function githubAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: input.scope ?? GITHUB_OAUTH_SCOPE,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params}`;
}

export function createOauthState(): string {
  return crypto.randomUUID();
}

export function writeOauthState(state: string, storage: Storage = sessionStorage): void {
  storage.setItem(GITHUB_OAUTH_STATE_KEY, state);
}

export function readOauthState(storage: Storage = sessionStorage): string | null {
  try {
    return storage.getItem(GITHUB_OAUTH_STATE_KEY);
  } catch {
    return null;
  }
}

export function clearOauthState(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(GITHUB_OAUTH_STATE_KEY);
  } catch {
    // private mode
  }
}

export function writeGithubUserSession(
  session: GithubUserSession,
  storage: Storage = sessionStorage,
): void {
  if (!isGithubLogin(session.login)) {
    return;
  }
  storage.setItem(GITHUB_USER_SESSION_KEY, JSON.stringify({ login: session.login }));
}

export function readGithubUserSession(storage: Storage = sessionStorage): GithubUserSession | null {
  try {
    const raw = storage.getItem(GITHUB_USER_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { login?: unknown };
    if (typeof parsed.login !== 'string' || !isGithubLogin(parsed.login)) {
      return null;
    }
    return { login: parsed.login };
  } catch {
    return null;
  }
}

export function clearGithubUserSession(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(GITHUB_USER_SESSION_KEY);
  } catch {
    // private mode
  }
}

export function startGithubOAuth(input: {
  clientId: string;
  origin: string;
  state?: string;
  storage?: Storage;
  assign?: (url: string) => void;
}): void {
  const clientId = input.clientId.trim();
  if (!clientId) {
    throw new Error('github oauth client id required');
  }
  const state = input.state ?? createOauthState();
  writeOauthState(state, input.storage);
  const url = githubAuthorizeUrl({
    clientId,
    redirectUri: githubOAuthRedirectUri(input.origin),
    state,
  });
  const assign = input.assign ?? ((href) => githubOAuthAssign.go(href));
  assign(url);
}

export function parseGithubOAuthCallback(search: string): GithubOAuthCallbackQuery {
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

export async function completeGithubOAuthCallback(input: {
  search: string;
  fetchImpl?: typeof fetch;
  storage?: Storage;
  exchangeUrl?: string;
}): Promise<GithubUserSession> {
  const storage = input.storage ?? sessionStorage;
  const parsed = parseGithubOAuthCallback(input.search);
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  if (!parsed.code) {
    throw new Error('missing oauth code');
  }
  const expected = readOauthState(storage);
  if (!parsed.state || parsed.state !== expected) {
    throw new Error('oauth state mismatch');
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(input.exchangeUrl ?? githubOAuthExchangeUrl(), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code: parsed.code, state: parsed.state }),
  });
  if (!response.ok) {
    throw new Error('oauth exchange failed');
  }
  const body: unknown = await response.json();
  if (payloadHasSecret(body)) {
    throw new Error('oauth must not return a token');
  }
  const login = loginFromExchangeBody(body);
  if (!login || !isGithubLogin(login)) {
    throw new Error('oauth login missing');
  }
  const session = { login };
  writeGithubUserSession(session, storage);
  clearOauthState(storage);
  return session;
}

export async function createGithubUserRepo(
  input: { yaml?: string; fetchImpl?: typeof fetch; reposUrl?: string } = {},
): Promise<GithubCreatedRepo | null> {
  const yaml = typeof input.yaml === 'string' ? input.yaml : '';
  const stack = e2eStackFromYaml(yaml);
  if (!stack) {
    return null;
  }
  try {
    const fetchImpl = input.fetchImpl ?? fetch;
    const response = await fetchImpl(input.reposUrl ?? githubOAuthReposUrl(), {
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
    const rec = body as { login?: unknown; url?: unknown; created?: unknown };
    if (rec.created !== true) {
      return null;
    }
    if (typeof rec.login !== 'string' || !isGithubLogin(rec.login)) {
      return null;
    }
    if (typeof rec.url !== 'string' || rec.url !== githubUserRepoUrl(rec.login, stack)) {
      return null;
    }
    return { login: rec.login, url: rec.url, created: true };
  } catch {
    return null;
  }
}

export async function pushGithubUserRepo(
  input: { yaml?: string; fetchImpl?: typeof fetch; contentsUrl?: string } = {},
): Promise<GithubPushedRepo | null> {
  const yaml = typeof input.yaml === 'string' ? input.yaml : '';
  const stack = e2eStackFromYaml(yaml);
  if (!stack) {
    return null;
  }
  try {
    const fetchImpl = input.fetchImpl ?? fetch;
    const response = await fetchImpl(input.contentsUrl ?? githubOAuthContentsUrl(), {
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
    const rec = body as { login?: unknown; url?: unknown; pushed?: unknown };
    if (rec.pushed !== true) {
      return null;
    }
    if (typeof rec.login !== 'string' || !isGithubLogin(rec.login)) {
      return null;
    }
    if (typeof rec.url !== 'string' || rec.url !== githubUserRepoUrl(rec.login, stack)) {
      return null;
    }
    return { login: rec.login, url: rec.url, pushed: true };
  } catch {
    return null;
  }
}
