import type { HTMLAttributes } from 'react';
import { cn } from './cn';
import {
  StabilityCell,
  stabilityStatusLabel,
  type StabilityHistoryPoint,
  type StabilityLang,
} from './StabilityCell';

export type { StabilityHistoryPoint };
export type TestsTableLang = StabilityLang;

export interface TestsTableRow {
  name: string;
  status: string;
  history: readonly StabilityHistoryPoint[];
  flakyFlips?: number;
  durationSec: number;
  durationFill: number;
}

export interface TestsTableProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  rows: readonly TestsTableRow[];
  /** Status + StabilityCell copy. Default `ru`. */
  lang?: TestsTableLang;
}

function normalizeStatus(status: string): string {
  return (status || 'unknown').toLowerCase();
}

function formatDurationSec(durationSec: number): string {
  return `${durationSec.toFixed(2)}s`;
}

/**
 * Tests table (`div.tests-table-wrap` > `table.tests-table`).
 * Thin wrapper — markup SSOT: `design-system/templates/tests-table.html` /
 * `css/tests-table.css`. Catalog: `preview/widgets.html#section-tests-table`
 * (`tests-table-demo`, 3 rows). Template: 2 rows, wrap without extra testid.
 * Columns Test / Status / Stability / Duration — **not** Trend. Status is
 * `span.badge.badge--status-{status}` via `stabilityStatusLabel` (not library
 * `Badge`). Stability composes `StabilityCell` (not a raw `div.stability-cell`).
 * Duration: `div.duration-bar` + `__value` + `__track` +
 * `span.duration-bar__fill.duration-bar__fill--{status}` (`width` %). Table
 * `min-width: 52rem`, wrap `overflow-x`, `font-size: var(--font-size-sm)`,
 * track `6px`. Default `lang` `ru`. Not tests-table-panel / adaptive /
 * `@container`, not Sparkline (trend is panel), not QG / `qg-info`, not
 * WidgetTile / WidgetMosaic / ChartTile / CodeHighlight, not toolbar / sort /
 * pagination / filters.
 */
export function TestsTable({
  rows,
  lang = 'ru',
  className,
  ...rest
}: TestsTableProps) {
  return (
    <div className={cn('tests-table-wrap', className)} {...rest}>
      <table className="tests-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Status</th>
            <th>Stability</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = normalizeStatus(row.status);
            return (
              <tr key={row.name}>
                <td className="tests-table__name" title={row.name}>
                  {row.name}
                </td>
                <td className="tests-table__status">
                  <span className={`badge badge--status-${status}`}>
                    {stabilityStatusLabel(status, lang)}
                  </span>
                </td>
                <td className="tests-table__stability">
                  <StabilityCell
                    history={row.history}
                    flakyFlips={row.flakyFlips}
                    lang={lang}
                  />
                </td>
                <td className="tests-table__duration">
                  <div className="duration-bar">
                    <span className="duration-bar__value">
                      {formatDurationSec(row.durationSec)}
                    </span>
                    <span className="duration-bar__track">
                      <span
                        className={`duration-bar__fill duration-bar__fill--${status}`}
                        style={{ width: `${row.durationFill}%` }}
                      />
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
