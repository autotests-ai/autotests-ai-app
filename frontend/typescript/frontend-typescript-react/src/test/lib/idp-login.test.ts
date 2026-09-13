import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../../lib/appBase';
import {
  clearIdpSession,
  clearIdpState,
  cloudRepoName,
  cloudRepoUrl,
  completeIdpCallback,
  createCloudRepo,
  createIdpState,
  finishIdpCallback,
  IDP_CALLBACK_PATH,
  IDP_MARK_PATH,
  IDP_SCOPE,
  IDP_SESSION_KEY,
  IDP_STATE_KEY,
  idpAssign,
  idpAuthorizeHref,
  idpAuthorizeUrl,
  idpClientId,
  idpCloudReposUrl,
  idpConfigured,
  idpExchangeUrl,
  idpGate,
  idpRedirectUri,
  isCloudRepoUrl,
  isIdpAuthorizeUrl,
  isSchoolLogin,
  parseIdpCallback,
  readIdpSession,
  readIdpState,
  startIdpLogin,
  writeIdpSession,
  writeIdpState,
} from '../../lib/idp-login';

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

describe('idp-login', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('hides the client when env is empty and rejects GitHub as authorize URL', () => {
    expect(idpClientId()).toBe('test-idp-client');
    expect(idpAuthorizeUrl()).toBe('https://idp.example/auth');
    expect(idpConfigured()).toBe(true);
    expect(idpGate.configured()).toBe(true);
    expect(idpClientId({})).toBe('');
    expect(idpAuthorizeUrl({})).toBe('');
    expect(idpConfigured({})).toBe(false);
    expect(idpGate.configured({})).toBe(false);
    expect(idpClientId({ VITE_IDP_CLIENT_ID: '  school  ' })).toBe('school');
    expect(idpAuthorizeUrl({ VITE_IDP_AUTHORIZE_URL: ' https://idp.example/auth ' })).toBe(
      'https://idp.example/auth',
    );
    expect(isIdpAuthorizeUrl('https://idp.example/auth')).toBe(true);
    expect(
      isIdpAuthorizeUrl('http://127.0.0.1:8543/realms/qa-guru/protocol/openid-connect/auth'),
    ).toBe(true);
    expect(isIdpAuthorizeUrl('https://github.com/login/oauth/authorize')).toBe(false);
    expect(isIdpAuthorizeUrl('https://api.github.com/auth')).toBe(false);
    expect(isIdpAuthorizeUrl('ftp://idp.example/auth')).toBe(false);
    expect(isIdpAuthorizeUrl('not-a-url')).toBe(false);
    expect(isSchoolLogin('qaguru')).toBe(true);
    expect(isSchoolLogin('unknown')).toBe(false);
    expect(isSchoolLogin('Unknown')).toBe(false);
    expect(isSchoolLogin('')).toBe(false);
    expect(isSchoolLogin('-nope')).toBe(false);
    expect(idpRedirectUri('http://localhost:8081/')).toBe(
      `http://localhost:8081${IDP_CALLBACK_PATH}`,
    );
    expect(idpExchangeUrl()).toBe(apiUrl('/oauth/idp'));
    expect(IDP_MARK_PATH.startsWith('M12')).toBe(true);
  });

  it('builds the IdP authorize URL without a GitHub login or secret', () => {
    const url = idpAuthorizeHref({
      authorizeUrl: 'https://idp.example/auth',
      clientId: 'test-idp-client',
      redirectUri: idpRedirectUri('http://localhost:8081'),
      state: 'state-1',
    });
    expect(url.startsWith('https://idp.example/auth?')).toBe(true);
    expect(url).toContain('client_id=test-idp-client');
    expect(url).toContain(`scope=${encodeURIComponent(IDP_SCOPE)}`);
    expect(url).toContain('response_type=code');
    expect(url).toContain('state=state-1');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A8081%2Foauth%2Fidp%2Fcallback');
    expect(url).not.toContain('github.com');
    expect(url).not.toContain('token');
    expect(url).not.toContain('secret');
    expect(
      idpAuthorizeHref({
        authorizeUrl: 'https://idp.example/auth',
        clientId: 'test-idp-client',
        redirectUri: 'http://localhost:8081/oauth/idp/callback',
        state: 'state-1',
        scope: 'openid profile',
      }),
    ).toContain('scope=openid+profile');
  });

  it('stores login only and ignores unknown or secret session blobs', () => {
    const storage = memoryStorage();
    writeIdpSession({ login: 'unknown' }, storage);
    expect(storage.getItem(IDP_SESSION_KEY)).toBeNull();
    writeIdpSession({ login: 'qaguru' }, storage);
    expect(readIdpSession(storage)).toEqual({ login: 'qaguru' });
    expect(JSON.parse(storage.getItem(IDP_SESSION_KEY) ?? '{}')).toEqual({ login: 'qaguru' });
    storage.setItem(IDP_SESSION_KEY, '{');
    expect(readIdpSession(storage)).toBeNull();
    storage.setItem(IDP_SESSION_KEY, JSON.stringify({ login: 'unknown' }));
    expect(readIdpSession(storage)).toBeNull();
    storage.setItem(IDP_SESSION_KEY, JSON.stringify({ token: 'secret' }));
    expect(readIdpSession(storage)).toBeNull();
    storage.setItem(IDP_SESSION_KEY, JSON.stringify({ login: 'qaguru', token: 'secret' }));
    expect(readIdpSession(storage)).toBeNull();
    expect(readIdpSession(memoryStorage())).toBeNull();
    expect(readIdpSession(throwingStorage())).toBeNull();
    expect(readIdpState(throwingStorage())).toBeNull();
    expect(() => clearIdpState(throwingStorage())).not.toThrow();
    expect(() => clearIdpSession(throwingStorage())).not.toThrow();
    writeIdpSession({ login: 'qaguru' }, storage);
    clearIdpSession(storage);
    expect(storage.getItem(IDP_SESSION_KEY)).toBeNull();
  });

  it('starts IdP login and keeps state without a GitHub URL or token', () => {
    const storage = memoryStorage();
    const assign = vi.fn();
    startIdpLogin({
      clientId: '  test-idp-client  ',
      authorizeUrl: '  https://idp.example/auth  ',
      origin: 'http://localhost:8081',
      state: 'csrf-state',
      storage,
      assign,
    });
    expect(readIdpState(storage)).toBe('csrf-state');
    expect(assign).toHaveBeenCalledTimes(1);
    const href = String(assign.mock.calls[0]?.[0]);
    expect(href).toContain('https://idp.example/auth');
    expect(href).toContain('client_id=test-idp-client');
    expect(href).toContain('state=csrf-state');
    expect(href).not.toContain('github.com/login');
    expect(href).not.toContain('token');
    expect(() =>
      startIdpLogin({
        clientId: '  ',
        authorizeUrl: 'https://idp.example/auth',
        origin: 'http://localhost:8081',
        assign,
      }),
    ).toThrow(/client id required/);
    expect(() =>
      startIdpLogin({
        clientId: 'test-idp-client',
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        origin: 'http://localhost:8081',
        assign,
      }),
    ).toThrow(/authorize url required/);
  });

  it('starts IdP through idpAssign when assign is omitted', () => {
    const go = vi.spyOn(idpAssign, 'go').mockImplementation(() => undefined);
    const storage = memoryStorage();
    startIdpLogin({
      clientId: 'test-idp-client',
      authorizeUrl: 'https://idp.example/auth',
      origin: 'http://localhost:8081',
      storage,
    });
    expect(go).toHaveBeenCalledWith(expect.stringContaining('https://idp.example/auth'));
    expect(readIdpState(storage)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(createIdpState()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('assigns the IdP authorize URL on the window', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    idpAssign.go('https://idp.example/auth?client_id=test');
    expect(assign).toHaveBeenCalledWith('https://idp.example/auth?client_id=test');
  });

  it('clears IdP state on callback and never writes login from the query', () => {
    const storage = memoryStorage();
    writeIdpState('csrf', storage);
    writeIdpSession({ login: 'qaguru' }, storage);
    finishIdpCallback(storage);
    expect(storage.getItem(IDP_STATE_KEY)).toBeNull();
    expect(readIdpSession(storage)).toEqual({ login: 'qaguru' });
    finishIdpCallback(throwingStorage());
    expect(readIdpSession(storage)).toEqual({ login: 'qaguru' });
  });

  it('parses the IdP callback query and ignores login in the URL', () => {
    expect(parseIdpCallback('code=abc&state=s1&login=unknown')).toEqual({
      code: 'abc',
      state: 's1',
      error: undefined,
    });
    expect(parseIdpCallback('?error=access_denied')).toEqual({
      code: undefined,
      state: undefined,
      error: 'access_denied',
    });
  });

  it('exchanges code for login and never keeps a token', async () => {
    const storage = memoryStorage();
    writeIdpState('csrf', storage);
    const fetchImpl = vi.fn(async () => jsonResponse({ login: 'qaguru' }));
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf&login=unknown',
        fetchImpl,
        storage,
        exchangeUrl: '/api/oauth/idp',
        origin: 'http://localhost:8081',
      }),
    ).resolves.toEqual({ login: 'qaguru' });
    expect(readIdpSession(storage)).toEqual({ login: 'qaguru' });
    expect(readIdpState(storage)).toBeNull();
    expect(JSON.stringify(readIdpSession(storage))).not.toContain('token');
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/oauth/idp',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          code: 'idp-code',
          state: 'csrf',
          redirectUri: 'http://localhost:8081/oauth/idp/callback',
        }),
      }),
    );
  });

  it('uses the default fetch and exchange URL on success', async () => {
    writeIdpState('csrf');
    const fetchMock = vi.fn(async () => jsonResponse({ login: 'qaguru' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(completeIdpCallback({ search: '?code=idp-code&state=csrf' })).resolves.toEqual({
      login: 'qaguru',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      idpExchangeUrl(),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(readIdpSession()).toEqual({ login: 'qaguru' });
  });

  it('refuses callback errors, secrets, and invented logins', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn();
    await expect(
      completeIdpCallback({ search: '?error=access_denied', fetchImpl, storage }),
    ).rejects.toThrow('access_denied');
    await expect(
      completeIdpCallback({ search: '?state=csrf', fetchImpl, storage }),
    ).rejects.toThrow('missing oauth code');
    writeIdpState('csrf', storage);
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=other',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth state mismatch');
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru' }, false));
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth exchange failed');
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', token: 'secret' }));
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth must not return a token');
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', access_token: 'idp_secret' }));
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth must not return a token');
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', id_token: 'eyJ' }));
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth must not return a token');
    expect(readIdpSession(storage)).toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', access_token: '' }));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'unknown' }));
    fetchImpl.mockResolvedValueOnce(jsonResponse([]));
    fetchImpl.mockResolvedValueOnce(jsonResponse(null));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 12 }));
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).resolves.toEqual({ login: 'qaguru' });
    writeIdpState('csrf', storage);
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
    writeIdpState('csrf', storage);
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
    writeIdpState('csrf', storage);
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
    writeIdpState('csrf', storage);
    await expect(
      completeIdpCallback({
        search: '?code=idp-code&state=csrf',
        fetchImpl,
        storage,
      }),
    ).rejects.toThrow('oauth login missing');
  });

  it('builds the autotests-cloud repo URL from IdP login and YAML e2e.stack', () => {
    expect(idpCloudReposUrl()).toBe(apiUrl('/cloud/repos'));
    expect(cloudRepoName('qaguru', 'python-pytest')).toBe('qaguru-python-pytest');
    expect(cloudRepoUrl('qaguru', 'python-pytest')).toBe(
      'https://github.com/autotests-cloud/qaguru-python-pytest',
    );
    expect(cloudRepoUrl('unknown', 'python-pytest')).toBe('');
    expect(cloudRepoUrl('qaguru', '')).toBe('');
    expect(
      isCloudRepoUrl('qaguru', 'https://github.com/autotests-cloud/qaguru-python-pytest'),
    ).toBe(true);
    expect(isCloudRepoUrl('qaguru', 'https://github.com/autotests-cloud/python-pytest')).toBe(
      false,
    );
    expect(isCloudRepoUrl('qaguru', 'https://github.com/qaguru/python-pytest')).toBe(false);
    expect(isCloudRepoUrl('qaguru', 'https://github.com/autotests-ai/python-pytest')).toBe(false);
    expect(
      isCloudRepoUrl('unknown', 'https://github.com/autotests-cloud/unknown-python-pytest'),
    ).toBe(false);
  });

  it('creates the org repo from Home YAML and never keeps a PAT', async () => {
    const url = cloudRepoUrl('qaguru', 'python-pytest');
    const yaml = [
      'destination: zip',
      'coverageProfile:',
      '  automation:',
      '    e2e: { access: write, stack: python-pytest, module: tests/python }',
      '',
    ].join('\n');
    const fetchImpl = vi.fn(async () => jsonResponse({ login: 'qaguru', url, created: true }));
    await expect(
      createCloudRepo({ fetchImpl, reposUrl: '/api/cloud/repos', yaml }),
    ).resolves.toEqual({ login: 'qaguru', url, created: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/cloud/repos',
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
  });

  it('uses the default fetch and cloud repos URL on create success', async () => {
    const url = cloudRepoUrl('qaguru', 'python-pytest');
    const yaml = [
      'destination: zip',
      'coverageProfile:',
      '  automation:',
      '    e2e: { access: write, stack: python-pytest, module: tests/python }',
      '',
    ].join('\n');
    const fetchMock = vi.fn(async () => jsonResponse({ login: 'qaguru', url, created: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(createCloudRepo({ yaml })).resolves.toEqual({
      login: 'qaguru',
      url,
      created: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      idpCloudReposUrl(),
      expect.objectContaining({ method: 'POST', credentials: 'include', body: yaml }),
    );
  });

  it('refuses create without YAML instead of a frozen stack', async () => {
    const fetchImpl = vi.fn();
    await expect(createCloudRepo({ fetchImpl })).resolves.toBeNull();
    await expect(createCloudRepo({ fetchImpl, yaml: '  ' })).resolves.toBeNull();
    await expect(createCloudRepo({ fetchImpl, yaml: 'destination: cloud\n' })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses create secrets, dest user URLs, push payloads, and HTTP errors', async () => {
    const url = cloudRepoUrl('qaguru', 'python-pytest');
    const yaml = [
      'destination: zip',
      'coverageProfile:',
      '  automation:',
      '    e2e: { access: write, stack: python-pytest, module: tests/python }',
      '',
    ].join('\n');
    const fetchImpl = vi.fn();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', url, created: true }, false));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({ login: 'qaguru', url, created: true, token: 'secret' }),
    );
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'unknown', url, created: true }));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        login: 'qaguru',
        url: 'https://github.com/qaguru/python-pytest',
        created: true,
      }),
    );
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        login: 'qaguru',
        url: 'https://github.com/autotests-cloud/python-pytest',
        created: true,
      }),
    );
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        login: 'qaguru',
        url: 'https://github.com/autotests-cloud/qaguru-java-junit5-rest_assured-selenide',
        created: true,
      }),
    );
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', url, created: false }));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({ login: 'qaguru', url, created: true, pushed: true }),
    );
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', url }));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse(null));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse([]));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 12, url, created: true }));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ login: 'qaguru', url: 12, created: true }));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
    fetchImpl.mockRejectedValueOnce(new Error('network'));
    await expect(createCloudRepo({ fetchImpl, yaml })).resolves.toBeNull();
  });
});

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}
