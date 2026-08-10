/**
 * Stack matrix helpers — SSOT logic for /stack/ (vanilla mount + SPA imports).
 * Data: ../stack/matrix.json ← python frontend/scripts/sync-stack-matrix.py
 */

import { mountHeaderPollToggle, POLL_DEFAULT_MS } from './poll-toggle.js';

const STACK_PREFIX = '/stack';

const PATH_RE = /^\/stack\/(backend-[^/]+)\/(frontend-[^/]+)/;

/** Nested product repo on GitHub — tree URLs for matrix `module` paths. */
export const GITHUB_TREE_BASE =
  'https://github.com/autotests-ai/reference-app-copy/tree/main';

/** Octocat mark path (viewBox 0 0 24 24) — same as product header. */
export const GITHUB_MARK_PATH =
  'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z';

export function parseMount(pathname) {
  const match = String(pathname || '').match(PATH_RE);
  if (match) {
    return { backendId: match[1], frontendId: match[2] };
  }
  const fe = String(pathname || '').match(/^\/stack\/(frontend-[^/]+)/);
  return {
    backendId: null,
    frontendId: fe ? fe[1] : null,
  };
}

export function parseTestsId(search = typeof window !== 'undefined' ? window.location.search : '') {
  try {
    return new URLSearchParams(search).get('tests');
  } catch {
    return null;
  }
}

export function isOpenable(status) {
  return status === 'active' || status === 'stub';
}

export function comboHref(backendId, frontendId, path = '/') {
  let p = path == null || path === '' ? '/' : String(path);
  if (p.charAt(0) !== '/') p = `/${p}`;
  if (!backendId || !frontendId) {
    if (frontendId) return `${STACK_PREFIX}/${frontendId}${p === '/' ? '/' : p}`;
    if (p === '/' || p === '') return `${STACK_PREFIX}/`;
    return p.startsWith(STACK_PREFIX) ? p : `${STACK_PREFIX}${p}`;
  }
  return `${STACK_PREFIX}/${backendId}/${frontendId}${p === '/' ? '/' : p}`;
}

export function stackHref(backendId, frontendId, testsId = null) {
  const base = comboHref(backendId, frontendId, '/');
  if (!testsId) return base;
  return `${base}?tests=${encodeURIComponent(testsId)}`;
}

/** GitHub folder for a matrix module path (`backend/python/...`). */
export function githubModuleHref(modulePath) {
  if (!modulePath) return null;
  const cleaned = String(modulePath).replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleaned || cleaned.includes('..')) return null;
  return `${GITHUB_TREE_BASE}/${cleaned}`;
}

export function findModuleById(items, id) {
  if (!id || !Array.isArray(items)) return null;
  const hit = items.find((item) => item && item.id === id);
  return hit?.module ?? null;
}

export function findById(items, id) {
  if (!id || !Array.isArray(items)) return null;
  return items.find((item) => item && item.id === id) || null;
}

/** Unit tests live inside the selected backend module (not under tests/). */
export function unitTestsPath(backend) {
  if (!backend?.module) return null;
  if (backend.language === 'python') return `${backend.module}/tests`;
  return `${backend.module}/src/test`;
}

/** Canonical RTL teaching path (Vitest + React Testing Library). */
export const COMPONENT_RTL_PATH =
  'frontend/typescript/frontend-typescript-react/src/test';

/**
 * Component / RTL tests — selected React FE `src/test`, else canonical
 * frontend-typescript-react RTL (static FE has no local component suite).
 */
export function componentTestsPath(frontend) {
  if (frontend?.module && frontend.kind !== 'static' && String(frontend.id || '').includes('react')) {
    return `${frontend.module}/src/test`;
  }
  if (frontend?.module && frontend.kind !== 'static') {
    return `${frontend.module}/src/test`;
  }
  return COMPONENT_RTL_PATH;
}

/** Short label for Module column (`frontend-typescript-react/src/test`). */
export function shortModuleLabel(path) {
  if (!path) return '';
  return String(path)
    .replace(/^frontend\/(?:javascript|typescript)\//, '')
    .replace(/^backend\/(?:java|kotlin|python|go)\//, '');
}

/** Meta under unit row — framework caption (path is the Module label). */
export function unitTestsMeta(backend) {
  if (!backend) return 'pick a backend';
  if (backend.language === 'python') return 'pytest';
  if (backend.language === 'java' || backend.language === 'kotlin') return 'junit5';
  if (backend.language === 'go') return 'testing';
  return backend.language || 'unit';
}

/** Meta under component row — library caption (path is the Module label). */
export function componentTestsMeta(path) {
  if (!path) return 'pick a frontend';
  if (path.includes('react') || path === COMPONENT_RTL_PATH) {
    return 'react-testing-library';
  }
  return shortModuleLabel(path);
}

export function resolveTestsId(data, requested) {
  const tests = data?.tests || [];
  if (requested && tests.some((t) => t && t.id === requested)) return requested;
  const active = tests.filter((t) => isOpenable(t.status || 'active'));
  const withApi = active.find((t) => (t.layers || []).includes('api'));
  return (withApi || active[0] || tests[0])?.id ?? null;
}

export function summarizeMatrix(data) {
  return {
    backends: data?.backends || [],
    frontends: data?.frontends || [],
    tests: data?.tests || [],
  };
}

export function matrixUrlFromPage() {
  // Prefer sibling matrix.json under /stack/ (works with APP_BASE prefix).
  try {
    return new URL('matrix.json', window.location.href).pathname;
  } catch {
    return './matrix.json';
  }
}

export async function fetchMatrix(url) {
  const res = await fetch(url || matrixUrlFromPage(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status) {
  if (status === 'slot' || status === 'stub' || status === 'derived') {
    return `<span class="badge" data-status="${escapeHtml(status)}">${escapeHtml(status)}</span>`;
  }
  return `<span class="badge badge--primary" data-status="active">active</span>`;
}

function githubIconHtml(modulePath, kind, id) {
  const href = githubModuleHref(modulePath);
  if (!href) return '';
  return `<a class="icon-btn stack-page__gh-icon" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub ${escapeHtml(id)}" title="${escapeHtml(modulePath)}" data-testid="stack-gh-${escapeHtml(kind)}-${escapeHtml(id)}"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="${GITHUB_MARK_PATH}"/></svg></span></a>`;
}

function rowHtml(item, kind, currentBackend, currentFrontend) {
  const id = item.id;
  const status = item.status || 'active';
  const meta =
    kind === 'backend'
      ? `${escapeHtml(item.language || 'backend')} · ${escapeHtml(status)}`
      : `${escapeHtml(item.kind || 'frontend')} · ${escapeHtml(status)}`;
  const isCurrent = kind === 'backend' ? id === currentBackend : id === currentFrontend;
  const targetBackend = kind === 'backend' ? id : currentBackend;
  const targetFrontend = kind === 'frontend' ? id : currentFrontend;
  const href = stackHref(targetBackend, targetFrontend);
  const openable = isOpenable(status) && targetBackend && targetFrontend;

  const nameCell = openable
    ? `<a class="link stack-page__id${isCurrent ? ' is-active' : ''}" href="${escapeHtml(href)}" data-testid="stack-${kind}-${escapeHtml(id)}">${escapeHtml(id)}</a>`
    : `<span class="stack-page__id stack-page__id--disabled${isCurrent ? ' is-active' : ''}" data-testid="stack-${kind}-${escapeHtml(id)}">${escapeHtml(id)}</span>`;
  const ghCell =
    githubIconHtml(item.module, kind, id) ||
    '<span class="text text--sm text--muted">—</span>';

  return `<tr class="${isCurrent ? 'stack-page__row--active' : ''}">
    <td>
      ${nameCell}
      <div class="text text--sm text--muted stack-page__meta">${meta}</div>
    </td>
    <td class="stack-page__gh-cell">${ghCell}</td>
    <td>${statusBadge(status)}</td>
    <td>${
      openable
        ? `<a class="link stack-page__open${isCurrent ? ' is-active' : ''}" href="${escapeHtml(href)}">open →</a>`
        : '<span class="text text--sm text--muted">—</span>'
    }</td>
  </tr>`;
}

function layersCell(layers) {
  const list = Array.isArray(layers) ? layers.filter(Boolean) : [];
  if (!list.length) {
    return '<td class="stack-page__layers-cell"><span class="text text--sm text--muted">—</span></td>';
  }
  return `<td class="stack-page__layers-cell"><span class="stack-page__layers" data-testid="stack-tests-layers">${escapeHtml(list.join(' · '))}</span></td>`;
}

function derivedLayerRow(layer, boundId, modulePath, meta, present, label = null) {
  const status = present ? 'derived' : 'slot';
  const isActive = Boolean(boundId);
  const display = label || layer;
  const ghHref = githubModuleHref(modulePath);
  const name = ghHref
    ? `<a class="link stack-page__id${isActive ? ' is-active' : ''}" href="${escapeHtml(ghHref)}" target="_blank" rel="noopener noreferrer" data-testid="stack-tests-${escapeHtml(layer)}">${escapeHtml(display)}</a>`
    : `<span class="stack-page__id${isActive ? ' is-active' : ''} stack-page__id--disabled" data-testid="stack-tests-${escapeHtml(layer)}">${escapeHtml(display)}</span>`;
  const ghCell =
    githubIconHtml(modulePath, 'tests', layer) ||
    '<span class="text text--sm text--muted">—</span>';
  return `<tr class="${isActive ? 'stack-page__row--active' : ''}">
    <td>
      ${name}
      <div class="text text--sm text--muted stack-page__meta">${escapeHtml(meta)}</div>
    </td>
    ${layersCell([layer])}
    <td class="stack-page__gh-cell">${ghCell}</td>
    <td>${statusBadge(status)}</td>
    <td><span class="text text--sm text--muted">—</span></td>
  </tr>`;
}

function testsModuleRow(item, currentBackend, currentFrontend, currentTests) {
  const id = item.id;
  const status = item.status || 'active';
  const layers = Array.isArray(item.layers) ? item.layers : [];
  const meta = `${escapeHtml(item.language || 'tests')} · ${escapeHtml(status)}`;
  const isCurrent = id === currentTests;
  const selectable = isOpenable(status) && currentBackend && currentFrontend;
  const href = stackHref(currentBackend, currentFrontend, id);
  const nameCell = selectable
    ? `<a class="link stack-page__id${isCurrent ? ' is-active' : ''}" href="${escapeHtml(href)}" data-testid="stack-tests-${escapeHtml(id)}">${escapeHtml(id)}</a>`
    : `<span class="stack-page__id stack-page__id--disabled${isCurrent ? ' is-active' : ''}" data-testid="stack-tests-${escapeHtml(id)}">${escapeHtml(id)}</span>`;
  const ghCell =
    githubIconHtml(item.module, 'tests', id) ||
    '<span class="text text--sm text--muted">—</span>';

  return `<tr class="${isCurrent ? 'stack-page__row--active' : ''}">
    <td>
      ${nameCell}
      <div class="text text--sm text--muted stack-page__meta">${meta}</div>
    </td>
    ${layersCell(layers)}
    <td class="stack-page__gh-cell">${ghCell}</td>
    <td>${statusBadge(status)}</td>
    <td>${
      selectable
        ? `<a class="link stack-page__open${isCurrent ? ' is-active' : ''}" href="${escapeHtml(href)}">select →</a>`
        : '<span class="text text--sm text--muted">—</span>'
    }</td>
  </tr>`;
}

/**
 * Mount product stack boards into `root` (vanilla). Expects empty container.
 */
export function mountStackPage(root, data, pathname = window.location.pathname, search = window.location.search) {
  if (!root) return;
  const { backendId, frontendId } = parseMount(pathname);
  const summary = summarizeMatrix(data);
  const currentTests = resolveTestsId(data, parseTestsId(search));
  const backend = findById(summary.backends, backendId);
  const frontend = findById(summary.frontends, frontendId);
  const unitPath = unitTestsPath(backend);
  const componentPath = componentTestsPath(frontend);

  const labelParts = [];
  if (backendId && frontendId) labelParts.push(`${backendId} · ${frontendId}`);
  else if (frontendId) labelParts.push(`(no backend prefix) · ${frontendId}`);
  else labelParts.push('path without /{backend}/{frontend}/');
  if (currentTests) labelParts.push(currentTests);
  const label = labelParts.join(' · ');
  const homeHref = comboHref(backendId, frontendId, '/');

  const unitMeta = unitTestsMeta(backend);
  const componentMeta = componentTestsMeta(componentPath);

  root.innerHTML = `
    <div class="stack-page__header">
      <a class="badge badge--primary stack-page__current" href="${escapeHtml(homeHref)}" title="open app home" data-testid="stack-current-pair">${escapeHtml(label)}</a>
    </div>
    <div class="stack-page__boards">
      <section class="panel panel--content stack-page__board">
        <div class="panel__bar">
          <div class="panel__dots" aria-hidden="true">
            <span class="panel__dot"></span><span class="panel__dot"></span><span class="panel__dot"></span>
          </div>
          <div class="panel__trail"><span class="panel__title">Backend</span></div>
        </div>
        <div class="panel__body stack-page__board-body">
          <table class="stack-page__table">
            <thead><tr><th>Module</th><th class="stack-page__gh-cell">GH</th><th>Status</th><th>Open</th></tr></thead>
            <tbody>
              ${summary.backends.map((b) => rowHtml(b, 'backend', backendId, frontendId)).join('')}
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel panel--content stack-page__board">
        <div class="panel__bar">
          <div class="panel__dots" aria-hidden="true">
            <span class="panel__dot"></span><span class="panel__dot"></span><span class="panel__dot"></span>
          </div>
          <div class="panel__trail"><span class="panel__title">Frontend</span></div>
        </div>
        <div class="panel__body stack-page__board-body">
          <table class="stack-page__table">
            <thead><tr><th>Module</th><th class="stack-page__gh-cell">GH</th><th>Status</th><th>Open</th></tr></thead>
            <tbody>
              ${summary.frontends.map((f) => rowHtml(f, 'frontend', backendId, frontendId)).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <section class="panel panel--content stack-page__board stack-page__board--tests" data-testid="stack-tests-board">
      <div class="panel__bar">
        <div class="panel__dots" aria-hidden="true">
          <span class="panel__dot"></span><span class="panel__dot"></span><span class="panel__dot"></span>
        </div>
        <div class="panel__trail"><span class="panel__title">Tests</span></div>
      </div>
      <div class="panel__body stack-page__board-body">
        <table class="stack-page__table stack-page__table--tests">
          <thead><tr><th>Module</th><th>Layers</th><th class="stack-page__gh-cell">GH</th><th>Status</th><th>Select</th></tr></thead>
          <tbody>
            ${derivedLayerRow(
              'unit',
              backendId,
              unitPath,
              unitMeta,
              Boolean(unitPath),
              shortModuleLabel(unitPath) || 'unit',
            )}
            ${derivedLayerRow(
              'component',
              frontendId,
              componentPath,
              componentMeta,
              Boolean(componentPath),
              shortModuleLabel(componentPath),
            )}
            ${summary.tests.map((t) => testsModuleRow(t, backendId, frontendId, currentTests)).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function loadStackPage(root, options = {}) {
  const errEl = options.errEl || null;
  try {
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = '';
    }
    const data = await fetchMatrix(options.matrixUrl);
    mountStackPage(
      root,
      data,
      options.pathname || window.location.pathname,
      options.search || window.location.search,
    );
  } catch (e) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent =
        'Не удалось загрузить matrix.json — sync: python frontend/scripts/sync-stack-matrix.py. ' +
        e;
    } else if (root) {
      root.innerHTML = `<p class="text reference-app__error" data-testid="stack-error">Не удалось загрузить matrix.json — ${escapeHtml(String(e))}</p>`;
    }
  }
}

function bindStackHeaderPoll(root, options = {}) {
  const intervalMs = options.pollMs ?? POLL_DEFAULT_MS;
  if (options.poll === false) {
    return () => {};
  }

  let disposePoll = null;
  let observer = null;

  const attach = () => {
    const tools = document.querySelector('[data-testid="header-tools"]');
    if (!tools) return false;
    disposePoll?.();
    disposePoll = mountHeaderPollToggle({
      intervalMs,
      defaultOn: options.pollDefaultOn !== false,
      onTick: () => {
        void loadStackPage(root, options);
      },
    });
    return true;
  };

  if (!attach()) {
    observer = new MutationObserver(() => {
      if (attach()) {
        observer?.disconnect();
        observer = null;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    observer?.disconnect();
    disposePoll?.();
  };
}

export async function bootStackPage(root, options = {}) {
  await loadStackPage(root, options);
  return bindStackHeaderPoll(root, options);
}
