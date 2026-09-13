import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../../lib/appBase';
import {
  clearGithubUserSession,
  clearOauthState,
  completeGithubOAuthCallback,
  createGithubUserRepo,
  createOauthState,
  GITHUB_AUTHORIZE_URL,
  GITHUB_OAUTH_CALLBACK_PATH,
  GITHUB_OAUTH_SCOPE,
  GITHUB_USER_REPO_NAME,
  GITHUB_USER_SESSION_KEY,
  githubAuthorizeUrl,
  githubOAuthAssign,
  githubOAuthClientId,
  githubOAuthContentsUrl,
  githubOAuthExchangeUrl,
  githubOAuthRedirectUri,
  githubOAuthReposUrl,
  githubUserRepoUrl,
  githubUserUrl,
  isGithubLogin,
  parseGithubOAuthCallback,
  pushGithubUserRepo,
  readGithubUserSession,
  readOauthState,
  startGithubOAuth,
  writeGithubUserSession,
  writeOauthState,
} from '../../lib/github-oauth';
import { TAKEAWAY_TESTS_STACK } from '../../lib/landing-config';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

function throwingStorage(): Storage {
  return {
    get length() {
      return 0;
    },
    clear() {
      throw new Error('blocked');
    },
    getItem() {
      throw new Error('blocked');
    },
    key() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe('github-oauth', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('accepts real GitHub logins and rejects unknown or invented names', () => {
    expect(isGithubLogin('octocat')).toBe(true);
    expect(isGithubLogin('a')).toBe(true);
    expect(isGithubLogin('unknown')).toBe(false);
    expect(isGithubLogin('Unknown')).toBe(false);
    expect(isGithubLogin('')).toBe(false);
    expect(isGithubLogin('-octo')).toBe(false);
    expect(isGithubLogin('octo-')).toBe(false);
    expect(githubUserUrl('octocat')).toBe('https://github.com/octocat');
    expect(githubUserUrl('unknown')).toBe('');
    expect(githubUserUrl('')).toBe('');
    expect(githubUserRepoUrl('octocat')).toBe(
      `https://github.com/octocat/${GITHUB_USER_REPO_NAME}`,
    );
    expect(GITHUB_USER_REPO_NAME).toBe(TAKEAWAY_TESTS_STACK);
    expect(githubUserRepoUrl('unknown')).toBe('');
    expect(githubUserRepoUrl('octocat', '')).toBe('');
    expect(githubUserRepoUrl('octocat')).not.toContain('autotests-cloud');
    expect(githubUserRepoUrl('octocat')).not.toContain('autotests-ai/');
  });

  it('builds the GitHub authorize URL without a PAT', () => {
    expect(githubOAuthClientId()).toBe('test-github-oauth-client');
    expect(githubOAuthClientId({})).toBe('');
    expect(githubOAuthExchangeUrl()).toBe(apiUrl('/oauth/github'));
    expect(githubOAuthReposUrl()).toBe(apiUrl('/oauth/github/repos'));
    expect(githubOAuthContentsUrl()).toBe(apiUrl('/oauth/github/repos/contents'));
    expect(githubOAuthRedirectUri('http://localhost:8081/')).toBe(
      `http://localhost:8081${GITHUB_OAUTH_CALLBACK_PATH}`,
    );
    const url = githubAuthorizeUrl({
      clientId: 'test-github-oauth-client',
      redirectUri: githubOAuthRedirectUri('http://localhost:8081'),
      state: 'state-1',
    });
    expect(url.startsWith(`${GITHUB_AUTHORIZE_URL}?`)).toBe(true);
    expect(url).toContain('client_id=test-github-oauth-client');
    expect(url).toContain(`scope=${encodeURIComponent(GITHUB_OAUTH_SCOPE)}`);
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A8081%2Foauth%2Fgithub%2Fcallback');
    expect(url.toLowerCase()).not.toContain('pat');
    expect(url).not.toContain('token');
    expect(
      githubAuthorizeUrl({
        clientId: 'test-github-oauth-client',
        redirectUri: 'http://localhost:8081/oauth/github/callback',
        state: 'state-1',
        scope: 'read:user',
      }),
    ).toContain('scope=read%3Auser');
  });

  it('stores login only and ignores unknown or broken session blobs', () => {
    const storage = memoryStorage();
    writeGithubUserSession({ login: 'unknown' }, storage);
    expect(storage.getItem(GITHUB_USER_SESSION_KEY)).toBeNull();
    writeGithubUserSession({ login: 'octocat' }, storage);
    expect(readGithubUserSession(storage)).toEqual({ login: 'octocat' });
    expect(JSON.parse(storage.getItem(GITHUB_USER_SESSION_KEY) ?? '{}')).toEqual({
      login: 'octocat',
    });
    storage.setItem(GITHUB_USER_SESSION_KEY, '{');
    expect(readGithubUserSession(storage)).toBeNull();
    storage.setItem(GITHUB_USER_SESSION_KEY, JSON.stringify({ login: 'unknown' }));
    expect(readGithubUserSession(storage)).toBeNull();
    storage.setItem(GITHUB_USER_SESSION_KEY, JSON.stringify({ token: 'secret' }));
    expect(readGithubUserSession(storage)).toBeNull();
    expect(readGithubUserSession(memoryStorage())).toBeNull();
    expect(readGithubUserSession(throwingStorage())).toBeNull();
    expect(readOauthState(throwingStorage())).toBeNull();
    expect(() => clearOauthState(throwingStorage())).not.toThrow();
    expect(() => clearGithubUserSession(throwingStorage())).not.toThrow();
    clearGithubUserSession(storage);
    expect(storage.getItem(GITHUB_USER_SESSION_KEY)).toBeNull();
  });

  it('starts GitHub OAuth and keeps state without a token field', () => {
    const storage = memoryStorage();
    const assign = vi.fn();
    startGithubOAuth({
      clientId: '  test-github-oauth-client  ',
      origin: 'http://localhost:8081',
      state: 'csrf-state',
      storage,
      assign,
    });
    expect(readOauthState(storage)).toBe('csrf-state');
    expect(assign).toHaveBeenCalledTimes(1);
    const href = String(assign.mock.calls[0]?.[0]);
    expect(href).toContain('https://github.com/login/oauth/authorize');
    expect(href).toContain('state=csrf-state');
    expect(href).not.toContain('token');
    expect(() =>
      startGithubOAuth({ clientId: '  ', origin: 'http://localhost:8081', assign }),
    ).toThrow(/client id required/);
  });

  it('starts OAuth through githubOAuthAssign when assign is omitted', () => {
    const go = vi.spyOn(githubOAuthAssign, 'go').mockImplementation(() => undefined);
    const storage = memoryStorage();
    startGithubOAuth({
      clientId: 'test-github-oauth-client',
      origin: 'http://localhost:8081',
      storage,
    });
    expect(go).toHaveBeenCalledWith(
      expect.stringContaining('https://github.com/login/oauth/authorize'),
    );
    expect(readOauthState(storage)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(createOauthState()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('assigns the GitHub authorize URL on the window', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    githubOAuthAssign.go('https://github.com/login/oauth/authorize?client_id=test');
    expect(assign).toHaveBeenCalledWith('https://github.com/login/oauth/authorize?client_id=test');
  });

  it('parses the GitHub callback query', () => {
    expect(parseGithubOAuthCallback('code=abc&state=s1')).toEqual({
      code: 'abc',
      state: 's1',
      error: undefined,
    });
    expect(parseGithubOAuthCallback('?error=access_denied')).toEqual({
      code: undefined,
      state: undefined,
      error: 'access_denied',
    });
  });

  it('exchanges code for login and never keeps a PAT', async () => {
    const storage = memoryStorage();
    writeOauthState('csrf', storage);
    const fetchImpl = vi.fn(async () => jsonResponse({ login: 'octocat' }));
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
        exchangeUrl: '/api/oauth/github',
      }),
    ).resolves.toEqual({ login: 'octocat' });
    expect(readGithubUserSession(storage)).toEqual({ login: 'octocat' });
    expect(readOauthState(storage)).toBeNull();
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/oauth/github',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ code: 'gh-code', state: 'csrf' }),
      }),
    );
  });

  it('uses the default fetch and exchange URL on success', async () => {
    writeOauthState('csrf');
    const fetchMock = vi.fn(async () => jsonResponse({ login: 'octocat' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      completeGithubOAuthCallback({ search: '?code=gh-code&state=csrf' }),
    ).resolves.toEqual({ login: 'octocat' });
    expect(fetchMock).toHaveBeenCalledWith(
      githubOAuthExchangeUrl(),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(readGithubUserSession()).toEqual({ login: 'octocat' });
  });

  it('refuses callback errors, secrets, and invented logins', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn();
    await expect(
      completeGithubOAuthCallback({ search: '?error=access_denied', fetchImpl, storage }),
    ).rejects.toThrow('access_denied');
    await expect(
      completeGithubOAuthCallback({ search: '?state=csrf', fetchImpl, storage }),
    ).rejects.toThrow('missing oauth code');
    writeOauthState('csrf', storage);
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=other',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth state mismatch');
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat' }, false));
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth exchange failed');
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', token: 'secret' }));
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth must not return a token');
    expect(readGithubUserSession(storage)).toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', access_token: '' }));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'unknown' }));
    fetchImpl.mockResolvedValueOnce(jsonResponse([]));
    fetchImpl.mockResolvedValueOnce(jsonResponse(null));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 12 }));
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).resolves.toEqual({ login: 'octocat' });
    writeOauthState('csrf', storage);
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
    writeOauthState('csrf', storage);
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
    writeOauthState('csrf', storage);
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
    writeOauthState('csrf', storage);
    await expect(
      completeGithubOAuthCallback({
        search: '?code=gh-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
  });

  it('creates the frozen user repo from the httpOnly cookie and never keeps a PAT', async () => {
    const url = githubUserRepoUrl('octocat');
    const fetchImpl = vi.fn(async () => jsonResponse({ login: 'octocat', url, created: true }));
    await expect(
      createGithubUserRepo({ fetchImpl, reposUrl: '/api/oauth/github/repos' }),
    ).resolves.toEqual({
      login: 'octocat',
      url,
      created: true,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/oauth/github/repos',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('uses the default fetch and repos URL on create success', async () => {
    const url = githubUserRepoUrl('octocat');
    const fetchMock = vi.fn(async () => jsonResponse({ login: 'octocat', url, created: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(createGithubUserRepo()).resolves.toEqual({
      login: 'octocat',
      url,
      created: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      githubOAuthReposUrl(),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('refuses create secrets, invented logins, org URLs, and HTTP errors', async () => {
    const url = githubUserRepoUrl('octocat');
    const fetchImpl = vi.fn();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url, created: true }, false));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({ login: 'octocat', url, created: true, token: 'secret' }),
    );
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'unknown', url, created: true }));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        login: 'octocat',
        url: 'https://github.com/autotests-cloud/java-junit5-rest_assured-selenide',
        created: true,
      }),
    );
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        login: 'octocat',
        url: 'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
        created: true,
      }),
    );
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url, created: false }));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url }));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse(null));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse([]));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 12, url, created: true }));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url: 12, created: true }));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse('octocat'));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    fetchImpl.mockRejectedValueOnce(new Error('network'));
    await expect(createGithubUserRepo({ fetchImpl })).resolves.toBeNull();
  });

  it('pushes the assemble tree from Home YAML and never keeps a PAT', async () => {
    const url = githubUserRepoUrl('octocat');
    const yaml = 'destination: zip\ncoverageProfile:\n  product: {}\n';
    const fetchImpl = vi.fn(async () => jsonResponse({ login: 'octocat', url, pushed: true }));
    await expect(
      pushGithubUserRepo({
        fetchImpl,
        contentsUrl: '/api/oauth/github/repos/contents',
        yaml,
      }),
    ).resolves.toEqual({
      login: 'octocat',
      url,
      pushed: true,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/oauth/github/repos/contents',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: yaml,
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/yaml',
        }),
      }),
    );
    expect(yaml).toContain('destination: zip');
    expect(yaml).not.toContain('destination: user');
  });

  it('uses the default fetch and contents URL on push success', async () => {
    const url = githubUserRepoUrl('octocat');
    const yaml = 'destination: zip\n';
    const fetchMock = vi.fn(async () => jsonResponse({ login: 'octocat', url, pushed: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(pushGithubUserRepo({ yaml })).resolves.toEqual({
      login: 'octocat',
      url,
      pushed: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      githubOAuthContentsUrl(),
      expect.objectContaining({ method: 'POST', credentials: 'include', body: yaml }),
    );
  });

  it('refuses push without YAML instead of a classpath dump', async () => {
    const fetchImpl = vi.fn();
    await expect(pushGithubUserRepo({ fetchImpl })).resolves.toBeNull();
    await expect(pushGithubUserRepo({ fetchImpl, yaml: '  ' })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses push secrets, invented logins, org URLs, and HTTP errors', async () => {
    const url = githubUserRepoUrl('octocat');
    const yaml = 'destination: zip\n';
    const fetchImpl = vi.fn();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url, pushed: true }, false));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({ login: 'octocat', url, pushed: true, token: 'secret' }),
    );
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'unknown', url, pushed: true }));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        login: 'octocat',
        url: 'https://github.com/autotests-cloud/java-junit5-rest_assured-selenide',
        pushed: true,
      }),
    );
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        login: 'octocat',
        url: 'https://github.com/autotests-ai/java-junit5-rest_assured-selenide',
        pushed: true,
      }),
    );
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url, pushed: false }));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url }));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse(null));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse([]));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 12, url, pushed: true }));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'octocat', url: 12, pushed: true }));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse('octocat'));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockRejectedValueOnce(new Error('network'));
    await expect(pushGithubUserRepo({ fetchImpl, yaml })).resolves.toBeNull();
  });
});
