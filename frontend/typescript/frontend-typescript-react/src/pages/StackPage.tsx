import { Badge, Link, Panel } from '@zero-design-system/react';
import { type MouseEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { appPath } from '../lib/appBase';
import { bindStackHeaderPoll } from '../lib/header-poll';
import {
  apiDocsHref,
  assignLocation,
  type BackendModule,
  componentTestsMeta,
  componentTestsPath,
  effectiveStackPair,
  type FrontendModule,
  fetchStackMatrix,
  findById,
  GITHUB_MARK_PATH,
  githubModuleHref,
  isOpenable,
  type ModuleStatus,
  parseTestsId,
  resolveSelection,
  resolveTestsId,
  type StackMatrix,
  shortModuleLabel,
  stackBoardHref,
  stackHref,
  summarizeMatrix,
  type TestsModule,
  UNIT_ROW_LAYERS,
  unitTestsMeta,
  unitTestsPath,
} from '../lib/stack-matrix';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; data: StackMatrix };

function layersLabel(layers?: string[]): string {
  return (layers || []).join(' · ');
}

function statusBadge(status: ModuleStatus | undefined) {
  const value = status || 'active';
  return <Badge variant={value === 'active' ? 'primary' : 'default'}>{value}</Badge>;
}

function GitHubMark() {
  return (
    <span className="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d={GITHUB_MARK_PATH} />
      </svg>
    </span>
  );
}

function SwaggerMark() {
  return (
    <span className="icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
        <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
      </svg>
    </span>
  );
}

function GitHubCell({
  modulePath,
  kind,
  id,
}: {
  modulePath?: string | null;
  kind: string;
  id: string;
}) {
  const href = githubModuleHref(modulePath);
  if (!href) {
    return <span className="text text--sm text--muted">—</span>;
  }
  return (
    <a
      className="icon-btn stack-page__gh-icon"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`GitHub ${id}`}
      title={String(modulePath)}
      data-testid={`stack-gh-${kind}-${id}`}
    >
      <GitHubMark />
    </a>
  );
}

function ApiDocsCell({ id, openable }: { id: string; openable: boolean }) {
  const href = openable ? apiDocsHref(id) : null;
  if (!href) {
    return <span className="text text--sm text--muted">—</span>;
  }
  return (
    <a
      className="icon-btn stack-page__gh-icon"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Swagger ${id}`}
      title="Swagger UI"
      data-testid={`stack-api-${id}`}
    >
      <SwaggerMark />
    </a>
  );
}

export function StackPage() {
  const location = useLocation();
  const selection = resolveSelection(location.pathname, location.search);
  const requestedTests = parseTestsId(location.search);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    function loadMatrix() {
      fetchStackMatrix(appPath('/stack/matrix.json'))
        .then((data) => {
          if (active) setState({ status: 'loaded', data });
        })
        .catch((error: Error) => {
          if (active) setState({ status: 'error', message: error.message });
        });
    }

    loadMatrix();
    const disposePoll = bindStackHeaderPoll(() => loadMatrix());
    return () => {
      active = false;
      disposePoll();
    };
  }, []);

  const summary = state.status === 'loaded' ? summarizeMatrix(state.data) : null;
  const currentTests =
    state.status === 'loaded' ? resolveTestsId(state.data, requestedTests) : null;
  const backend = summary ? findById(summary.backends, selection.backendId) : null;
  const frontend = summary ? findById(summary.frontends, selection.frontendId) : null;
  const unitPath = unitTestsPath(backend);
  const componentPath = componentTestsPath(frontend);
  const unitMeta = unitTestsMeta(backend);
  const unitLabel = shortModuleLabel(unitPath) || 'unit';
  const componentMeta = componentTestsMeta(componentPath);
  const componentLabel = shortModuleLabel(componentPath);

  const labelParts: string[] = [];
  if (selection.frontendId && !selection.backendId && !selection.hub) {
    labelParts.push(`(no backend prefix) · ${selection.frontendId}`);
  } else {
    labelParts.push(`${selection.backendId} · ${selection.frontendId}`);
  }
  if (currentTests) labelParts.push(currentTests);
  const label = labelParts.join(' · ');
  const homeHref = stackHref(selection.backendId, selection.frontendId);

  function metaFor(kind: 'backend' | 'frontend', item: BackendModule | FrontendModule): string {
    const status = item.status || 'active';
    return kind === 'backend'
      ? `${(item as BackendModule).language || 'backend'} · ${status}`
      : `${(item as FrontendModule).kind || 'frontend'} · ${status}`;
  }

  function testsMeta(item: TestsModule): string {
    const status = item.status || 'active';
    return `${item.language || 'tests'} · ${status}`;
  }

  function rowSelectHref(
    kind: 'backend' | 'frontend',
    item: BackendModule | FrontendModule,
  ): string {
    const { backendId, frontendId } = effectiveStackPair(
      kind === 'backend' ? item.id : selection.backendId,
      kind === 'frontend' ? item.id : selection.frontendId,
    );
    return selection.hub
      ? stackBoardHref(backendId, frontendId, currentTests)
      : stackHref(backendId, frontendId);
  }

  function rowHref(kind: 'backend' | 'frontend', item: BackendModule | FrontendModule): string {
    const { backendId, frontendId } = effectiveStackPair(
      kind === 'backend' ? item.id : selection.backendId,
      kind === 'frontend' ? item.id : selection.frontendId,
    );
    return stackHref(backendId, frontendId);
  }

  function testsHref(item: TestsModule): string {
    const { backendId, frontendId } = effectiveStackPair(selection.backendId, selection.frontendId);
    return selection.hub
      ? stackBoardHref(backendId, frontendId, item.id)
      : stackHref(backendId, frontendId, item.id);
  }

  function onHubRowClick(event: MouseEvent<HTMLTableRowElement>, href: string) {
    if ((event.target as HTMLElement).closest('a, button')) return;
    assignLocation(href);
  }

  return (
    <main className="page-shell page-shell--below-header stack-page" data-testid="stack-page">
      <div className="stack-page__header">
        <a
          className="badge badge--primary stack-page__current"
          href={homeHref}
          title="open app home"
          data-testid="stack-current-pair"
        >
          {label}
        </a>
      </div>

      {state.status === 'error' ? (
        <div className="stack-page__error" data-testid="stack-error">
          Не удалось загрузить matrix.json — sync: python frontend/scripts/sync-stack-matrix.py.{' '}
          {state.message}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <p className="text text--muted" data-testid="stack-loading">
          → Loading matrix…
        </p>
      ) : null}

      {summary ? (
        <div className="stack-page__boards">
          <Panel
            title="Backend"
            bodyClassName="stack-page__board-body"
            className="stack-page__board"
          >
            <table className="stack-page__table stack-page__table--backend">
              <thead>
                <tr>
                  <th>Module</th>
                  <th className="stack-page__gh-cell">GH</th>
                  <th className="stack-page__gh-cell">API</th>
                  <th>Status</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {summary.backends.map((item) => {
                  const openable = isOpenable(item.status);
                  const current = item.id === selection.backendId;
                  const selectHref = rowSelectHref('backend', item);
                  return (
                    <tr
                      key={item.id}
                      className={[
                        current ? 'stack-page__row--active' : '',
                        openable && selection.hub ? 'stack-page__row--selectable' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={
                        openable && selection.hub
                          ? (event) => onHubRowClick(event, selectHref)
                          : undefined
                      }
                    >
                      <td>
                        {openable ? (
                          <Link
                            className="stack-page__id"
                            active={current}
                            href={selectHref}
                            data-testid={`stack-backend-${item.id}`}
                          >
                            {item.id}
                          </Link>
                        ) : (
                          <span
                            className={`stack-page__id stack-page__id--disabled${current ? ' is-active' : ''}`}
                            data-testid={`stack-backend-${item.id}`}
                          >
                            {item.id}
                          </span>
                        )}
                        <div className="text text--sm text--muted stack-page__meta">
                          {metaFor('backend', item)}
                        </div>
                      </td>
                      <td className="stack-page__gh-cell">
                        <GitHubCell modulePath={item.module} kind="backend" id={item.id} />
                      </td>
                      <td className="stack-page__gh-cell">
                        <ApiDocsCell id={item.id} openable={openable} />
                      </td>
                      <td>{statusBadge(item.status)}</td>
                      <td>
                        {openable ? (
                          <Link
                            className="stack-page__open"
                            active={current}
                            href={rowHref('backend', item)}
                          >
                            open →
                          </Link>
                        ) : (
                          <span className="text text--sm text--muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Frontend"
            bodyClassName="stack-page__board-body"
            className="stack-page__board"
          >
            <table className="stack-page__table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th className="stack-page__gh-cell">GH</th>
                  <th>Status</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {summary.frontends.map((item) => {
                  const openable = isOpenable(item.status);
                  const current = item.id === selection.frontendId;
                  const selectHref = rowSelectHref('frontend', item);
                  return (
                    <tr
                      key={item.id}
                      className={[
                        current ? 'stack-page__row--active' : '',
                        openable && selection.hub ? 'stack-page__row--selectable' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={
                        openable && selection.hub
                          ? (event) => onHubRowClick(event, selectHref)
                          : undefined
                      }
                    >
                      <td>
                        {openable ? (
                          <Link
                            className="stack-page__id"
                            active={current}
                            href={selectHref}
                            data-testid={`stack-frontend-${item.id}`}
                          >
                            {item.id}
                          </Link>
                        ) : (
                          <span
                            className={`stack-page__id stack-page__id--disabled${current ? ' is-active' : ''}`}
                            data-testid={`stack-frontend-${item.id}`}
                          >
                            {item.id}
                          </span>
                        )}
                        <div className="text text--sm text--muted stack-page__meta">
                          {metaFor('frontend', item)}
                        </div>
                      </td>
                      <td className="stack-page__gh-cell">
                        <GitHubCell modulePath={item.module} kind="frontend" id={item.id} />
                      </td>
                      <td>{statusBadge(item.status)}</td>
                      <td>
                        {openable ? (
                          <Link
                            className="stack-page__open"
                            active={current}
                            href={rowHref('frontend', item)}
                          >
                            open →
                          </Link>
                        ) : (
                          <span className="text text--sm text--muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Tests"
            bodyClassName="stack-page__board-body"
            className="stack-page__board stack-page__board--tests"
            testId="stack-tests-board"
          >
            <table className="stack-page__table stack-page__table--tests">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Layers</th>
                  <th className="stack-page__gh-cell">GH</th>
                  <th>Status</th>
                  <th>Select</th>
                </tr>
              </thead>
              <tbody>
                <tr className={selection.backendId ? 'stack-page__row--active' : ''}>
                  <td>
                    {githubModuleHref(unitPath) ? (
                      <Link
                        className="stack-page__id"
                        active={Boolean(selection.backendId)}
                        href={githubModuleHref(unitPath)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="stack-tests-unit"
                      >
                        {unitLabel}
                      </Link>
                    ) : (
                      <span
                        className={`stack-page__id stack-page__id--disabled${selection.backendId ? ' is-active' : ''}`}
                        data-testid="stack-tests-unit"
                      >
                        {unitLabel}
                      </span>
                    )}
                    <div className="text text--sm text--muted stack-page__meta">{unitMeta}</div>
                  </td>
                  <td className="stack-page__layers-cell">
                    <span className="stack-page__layers" data-testid="stack-tests-layers">
                      {layersLabel(UNIT_ROW_LAYERS)}
                    </span>
                  </td>
                  <td className="stack-page__gh-cell">
                    <GitHubCell modulePath={unitPath} kind="tests" id="unit" />
                  </td>
                  <td>
                    <Badge>{unitPath ? 'derived' : 'slot'}</Badge>
                  </td>
                  <td>
                    <span className="text text--sm text--muted">—</span>
                  </td>
                </tr>

                <tr className="stack-page__row--active">
                  <td>
                    <Link
                      className="stack-page__id"
                      active={Boolean(selection.frontendId)}
                      href={githubModuleHref(componentPath)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="stack-tests-component"
                    >
                      {componentLabel}
                    </Link>
                    <div className="text text--sm text--muted stack-page__meta">
                      {componentMeta}
                    </div>
                  </td>
                  <td className="stack-page__layers-cell">
                    <span className="stack-page__layers" data-testid="stack-tests-layers">
                      component
                    </span>
                  </td>
                  <td className="stack-page__gh-cell">
                    <GitHubCell modulePath={componentPath} kind="tests" id="component" />
                  </td>
                  <td>
                    <Badge>derived</Badge>
                  </td>
                  <td>
                    <span className="text text--sm text--muted">—</span>
                  </td>
                </tr>

                {summary.tests.map((item) => {
                  const current = item.id === currentTests;
                  const selectable = isOpenable(item.status);
                  const href = testsHref(item);
                  const layers = layersLabel(item.layers);
                  return (
                    <tr
                      key={item.id}
                      className={[
                        current ? 'stack-page__row--active' : '',
                        selectable && selection.hub ? 'stack-page__row--selectable' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={
                        selectable && selection.hub
                          ? (event) => onHubRowClick(event, href)
                          : undefined
                      }
                    >
                      <td>
                        {selectable ? (
                          <Link
                            className="stack-page__id"
                            active={current}
                            href={href}
                            data-testid={`stack-tests-${item.id}`}
                          >
                            {item.id}
                          </Link>
                        ) : (
                          <span
                            className={`stack-page__id stack-page__id--disabled${current ? ' is-active' : ''}`}
                            data-testid={`stack-tests-${item.id}`}
                          >
                            {item.id}
                          </span>
                        )}
                        <div className="text text--sm text--muted stack-page__meta">
                          {testsMeta(item)}
                        </div>
                      </td>
                      <td className="stack-page__layers-cell">
                        {layers ? (
                          <span className="stack-page__layers" data-testid="stack-tests-layers">
                            {layers}
                          </span>
                        ) : (
                          <span className="text text--sm text--muted">—</span>
                        )}
                      </td>
                      <td className="stack-page__gh-cell">
                        <GitHubCell modulePath={item.module} kind="tests" id={item.id} />
                      </td>
                      <td>{statusBadge(item.status)}</td>
                      <td>
                        {selectable ? (
                          <Link className="stack-page__open" active={current} href={href}>
                            select →
                          </Link>
                        ) : (
                          <span className="text text--sm text--muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>
      ) : null}
    </main>
  );
}
