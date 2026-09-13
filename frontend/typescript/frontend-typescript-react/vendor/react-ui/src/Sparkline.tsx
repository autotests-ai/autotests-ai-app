import type { HTMLAttributes, SVGProps } from 'react';
import { cn } from './cn';
import {
  buildSparkline,
  sparklineThemeFromSite,
  type SparklineHistoryPoint,
  type SparklineLang,
  type SparklineTheme,
} from './sparkline-canon.js';

export type { SparklineHistoryPoint, SparklineLang, SparklineTheme };
export { sparklineThemeFromSite };

export interface SparklineProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Run durations → `history[].durationSec`. Fewer than 2 numbers → empty. */
  history: readonly SparklineHistoryPoint[];
  /** Palette from `sparklineThemeFromSite`. Omit → site light/dark. */
  theme?: SparklineTheme;
  /** Empty copy. Default `ru` («Нет истории»). */
  lang?: SparklineLang;
  /** SVG width. Default `88`. */
  width?: number;
  /** SVG height. Default `28`. */
  height?: number;
}

function siteSparklineTheme(): SparklineTheme {
  const site =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('theme-light')
      ? 'light'
      : 'dark';
  return sparklineThemeFromSite(site);
}

/**
 * Duration trend cell (`span.sparkline--empty` / `svg.sparkline--duration`).
 * Thin wrapper — markup SSOT: `design-system/templates/sparkline.html` /
 * `css/sparkline.css`. Geometry SSOT: `buildSparkline` /
 * `sparklineThemeFromSite` in `js/sparkline.js` (embed, not a rewrite).
 * Catalog: `preview/widgets.html#section-sparkline` (`sparkline-demo-empty` /
 * `-sparse` / `-dense`; not `-stability`). Default 88×28, `lang` `ru`.
 * Not Highcharts / nivo, not `stability-cell` / tests-table / QG / WidgetTile.
 */
export function Sparkline({
  history,
  theme,
  lang = 'ru',
  width = 88,
  height = 28,
  className,
  ...rest
}: SparklineProps) {
  const node = buildSparkline(history, theme ?? siteSparklineTheme(), {
    lang,
    width,
    height,
  });
  const rootClass = cn(node.getAttribute('class') ?? undefined, className);

  if (node.tagName === 'SPAN') {
    return (
      <span className={rootClass} {...rest}>
        {node.textContent}
      </span>
    );
  }

  const title = node.querySelector('title');
  const area = node.querySelector('.sparkline__area');
  const line = node.querySelector('.sparkline__line');

  return (
    <svg
      className={rootClass}
      width={node.getAttribute('width') ?? undefined}
      height={node.getAttribute('height') ?? undefined}
      viewBox={node.getAttribute('viewBox') ?? undefined}
      preserveAspectRatio={node.getAttribute('preserveAspectRatio') ?? undefined}
      role={node.getAttribute('role') ?? undefined}
      aria-label={node.getAttribute('aria-label') ?? undefined}
      {...(rest as SVGProps<SVGSVGElement>)}
    >
      {title ? <title>{title.textContent}</title> : null}
      {area ? (
        <polygon
          className="sparkline__area"
          points={area.getAttribute('points') ?? undefined}
          fill={area.getAttribute('fill') ?? undefined}
          fillOpacity={area.getAttribute('fill-opacity') ?? undefined}
        />
      ) : null}
      {line ? (
        <polyline
          className="sparkline__line"
          points={line.getAttribute('points') ?? undefined}
          fill={line.getAttribute('fill') ?? undefined}
          stroke={line.getAttribute('stroke') ?? undefined}
          strokeWidth={line.getAttribute('stroke-width') ?? undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
