import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';
import {
  buildStabilityCell,
  sparklineThemeFromSite,
  stabilityStatusLabel,
  type SparklineTheme,
  type StabilityHistoryPoint,
  type StabilityLang,
} from './stability-cell-canon.js';

export type { SparklineTheme, StabilityHistoryPoint, StabilityLang };
export { sparklineThemeFromSite, stabilityStatusLabel };

export interface StabilityCellProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Run statuses → `history[].status`. Empty → «—». */
  history: readonly StabilityHistoryPoint[];
  /** Flaky flip count. Default `0` (no `.badge--flaky`). */
  flakyFlips?: number;
  /** Palette from `sparklineThemeFromSite`. Omit → site light/dark. */
  theme?: SparklineTheme;
  /** Dot titles + flaky title. Default `ru` («Флипы flaky»). */
  lang?: StabilityLang;
  /** Last N runs. Default `10`. */
  limit?: number;
}

function siteSparklineTheme(): SparklineTheme {
  const site =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('theme-light')
      ? 'light'
      : 'dark';
  return sparklineThemeFromSite(site);
}

function dotsFromCanon(dotsWrap: Element | null): ReactNode {
  if (!dotsWrap) {
    return '—';
  }
  const dots = [...dotsWrap.querySelectorAll(':scope > .stability-dot')];
  if (dots.length === 0) {
    return dotsWrap.textContent;
  }
  return dots.map((dot, index) => (
    <span
      key={`${dot.className}-${index}`}
      className={dot.getAttribute('class') ?? undefined}
      title={dot.getAttribute('title') ?? undefined}
      style={{ background: (dot as HTMLElement).style.background }}
    />
  ));
}

/**
 * Status-dot cell (`div.stability-cell` + `span.stability-dots`).
 * Thin wrapper — markup SSOT: `design-system/templates/stability-cell.html` /
 * `css/stability-cell.css`. Embed SSOT: `buildStabilityCell` /
 * `stabilityStatusLabel` in `js/stability-cell.js` (embed, not a rewrite;
 * colors from `statusSparkColor` / `sparklineThemeFromSite` in
 * `js/sparkline.js`). Catalog: `preview/widgets.html#section-stability-cell`
 * (`stability-cell-empty` / `-stable` / `-flaky`; template `stability-cell`;
 * not `sparkline-demo-stability`). Default `lang` `ru`, `limit` `10`,
 * `flakyFlips` `0`. Dots 7×7, gap `3px`. Not Highcharts / nivo, not library
 * `Badge` instead of `span.badge.badge--flaky`, not Sparkline / tests-table /
 * QG / WidgetTile.
 */
export function StabilityCell({
  history,
  flakyFlips = 0,
  theme,
  lang = 'ru',
  limit = 10,
  className,
  ...rest
}: StabilityCellProps) {
  const node = buildStabilityCell(
    flakyFlips,
    [...history],
    theme ?? siteSparklineTheme(),
    { lang, limit },
  );
  const rootClass = cn(node.getAttribute('class') ?? undefined, className);
  const dotsWrap = node.querySelector(':scope > .stability-dots');
  const badge = node.querySelector(':scope > .badge.badge--flaky');

  return (
    <div className={rootClass} {...rest}>
      <span
        className={dotsWrap?.getAttribute('class') ?? 'stability-dots'}
        aria-hidden={true}
      >
        {dotsFromCanon(dotsWrap)}
      </span>
      {badge ? (
        <span
          className={badge.getAttribute('class') ?? 'badge badge--flaky'}
          title={badge.getAttribute('title') ?? undefined}
        >
          {badge.textContent}
        </span>
      ) : null}
    </div>
  );
}
