import { Fragment, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { cn } from './cn';

export const HAR_TIMING_KEYS = [
  'blocked',
  'dns',
  'connect',
  'ssl',
  'send',
  'wait',
  'receive',
] as const;

export type HarDetailTab = 'headers' | 'timings' | 'response';

export interface HarHeader {
  name?: string;
  value?: string;
}

export interface HarContent {
  size?: number;
  mimeType?: string;
  text?: string;
  encoding?: string;
}

export interface HarEntry {
  time?: number;
  startedDateTime?: string;
  request?: {
    method?: string;
    url?: string;
    headers?: HarHeader[];
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: HarHeader[];
    content?: HarContent;
  };
  timings?: Partial<Record<(typeof HAR_TIMING_KEYS)[number], number>>;
}

export function formatSize(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) {
    return '—';
  }
  if (v < 1024) {
    return `${v} B`;
  }
  if (v < 1024 * 1024) {
    return `${(v / 1024).toFixed(1)} KB`;
  }
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTiming(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) {
    return '—';
  }
  return `${Math.round(v)} ms`;
}

export function harStatusClass(status: unknown): string {
  const s = Number(status);
  if (s >= 500) {
    return 'har-status--err';
  }
  if (s >= 400) {
    return 'har-status--warn';
  }
  if (s >= 300) {
    return 'har-status--redir';
  }
  if (s > 0) {
    return 'har-status--ok';
  }
  return 'har-status--muted';
}

function headerPairs(headers: HarHeader[] | undefined) {
  if (!Array.isArray(headers)) {
    return [];
  }
  return headers
    .filter((h) => h && (h.name != null || h.value != null))
    .map((h) => ({ name: String(h.name || ''), value: String(h.value ?? '') }));
}

function HeaderKv({ title, headers }: { title: string; headers?: HarHeader[] }) {
  const pairs = headerPairs(headers);
  return (
    <div className="har-section">
      <div className="har-section__title">{title}</div>
      {pairs.length === 0 ? (
        <div className="har-muted">No headers captured.</div>
      ) : (
        <div className="har-kv">
          {pairs.map((h, i) => (
            <Fragment key={`${h.name}-${i}`}>
              <div className="har-kv__k">{h.name}</div>
              <div className="har-kv__v">{h.value || '—'}</div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS: { id: HarDetailTab; label: string }[] = [
  { id: 'headers', label: 'Headers' },
  { id: 'timings', label: 'Timings' },
  { id: 'response', label: 'Response' },
];

function EntryDetail({
  entry,
  tab,
  onTabChange,
}: {
  entry: HarEntry;
  tab: HarDetailTab;
  onTabChange: (tab: HarDetailTab) => void;
}) {
  const req = entry.request || {};
  const resp = entry.response || {};
  const content = resp.content || {};
  const timings = entry.timings || {};
  const status = Number(resp.status) || 0;
  const statusText = resp.statusText || '';
  const mime = content.mimeType || '—';
  const size = formatSize(content.size);
  const bodyText = typeof content.text === 'string' ? content.text : '';
  const bodyNote = bodyText ? bodyText : 'Body not captured (meta / headers + size only).';

  return (
    <div className="har-detail" data-testid="session-har-detail">
      <div className="har-tabs" role="tablist" aria-label="HAR entry details">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={tab === t.id ? 'har-tab har-tab--active' : 'har-tab'}
            aria-selected={tab === t.id}
            data-testid={`session-har-tab-${t.id}`}
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onTabChange(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'headers' && (
        <div className="har-tab-panel" role="tabpanel" data-testid="session-har-panel-headers">
          <HeaderKv title="Response Headers" headers={resp.headers} />
          <HeaderKv title="Request Headers" headers={req.headers} />
        </div>
      )}

      {tab === 'timings' && (
        <div className="har-tab-panel" role="tabpanel" data-testid="session-har-panel-timings">
          <div className="har-kv">
            {HAR_TIMING_KEYS.map((key) => (
              <Fragment key={key}>
                <div className="har-kv__k">{key}</div>
                <div className="har-kv__v">{formatTiming(timings[key])}</div>
              </Fragment>
            ))}
            <div className="har-kv__k">total</div>
            <div className="har-kv__v">{formatTiming(entry.time)}</div>
          </div>
        </div>
      )}

      {tab === 'response' && (
        <div className="har-tab-panel" role="tabpanel" data-testid="session-har-panel-response">
          <div className="har-kv">
            <div className="har-kv__k">status</div>
            <div className="har-kv__v">
              {status || '—'}
              {statusText ? ` ${statusText}` : ''}
            </div>
            <div className="har-kv__k">mimeType</div>
            <div className="har-kv__v">{mime}</div>
            <div className="har-kv__k">size</div>
            <div className="har-kv__v">{size}</div>
          </div>
          <div className="har-section">
            <div className="har-section__title">Body</div>
            <pre className={bodyText ? 'har-body' : 'har-body har-muted'}>{bodyNote}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export interface HarViewerProps {
  entries: HarEntry[];
  expandedIndex?: number | null;
  detailTab?: HarDetailTab;
  onToggleRow?: (index: number) => void;
  onDetailTabChange?: (tab: HarDetailTab) => void;
  /** Shown when entries is empty (loading / recording / error). */
  empty?: ReactNode;
  className?: string;
  testId?: string;
}

/** Presentational HAR table. Poll / Panel / download stay in the app shell. */
export function HarViewer({
  entries,
  expandedIndex = null,
  detailTab = 'headers',
  onToggleRow,
  onDetailTabChange,
  empty,
  className,
  testId = 'har-viewer',
}: HarViewerProps) {
  if (!entries.length) {
    return (
      <div className={cn('har-viewer', className)} data-testid={testId}>
        <div className="har-empty" data-testid="session-har-empty">
          {empty ?? 'No network entries.'}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('har-viewer', className)} data-testid={testId}>
      <div className="har-table-wrap">
        <table className="har-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Status</th>
              <th>URL</th>
              <th>Type</th>
              <th>Size</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const req = entry.request || {};
              const resp = entry.response || {};
              const content = resp.content || {};
              const status = Number(resp.status) || 0;
              const open = expandedIndex === idx;
              const rowId = `har-row-${idx}`;
              return (
                <Fragment key={`${req.method || 'GET'}-${req.url || ''}-${idx}`}>
                  <tr
                    id={rowId}
                    className={open ? 'har-row har-row--open' : 'har-row'}
                    tabIndex={0}
                    role="button"
                    aria-expanded={open}
                    aria-controls={`har-detail-${idx}`}
                    data-testid={`session-har-row-${idx}`}
                    onClick={() => onToggleRow?.(idx)}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggleRow?.(idx);
                      }
                    }}
                  >
                    <td className="har-method">{req.method || ''}</td>
                    <td className={harStatusClass(status)}>{status || '—'}</td>
                    <td className="har-url" title={req.url}>
                      {req.url || ''}
                    </td>
                    <td className="har-mime">{content.mimeType || '—'}</td>
                    <td>{formatSize(content.size)}</td>
                    <td>{Math.round(Number(entry.time) || 0)} ms</td>
                  </tr>
                  {open && (
                    <tr
                      id={`har-detail-${idx}`}
                      className="har-detail-row"
                      data-testid={`session-har-detail-row-${idx}`}
                    >
                      <td
                        colSpan={6}
                        onClick={(e: MouseEvent) => e.stopPropagation()}
                      >
                        <EntryDetail
                          entry={entry}
                          tab={detailTab}
                          onTabChange={(t) => onDetailTabChange?.(t)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
