import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/** Flow columns. `2` / `3` → `.widget-mosaic--2/--3`. Omit / `4` = default 4-col (no modifier). */
export type WidgetMosaicColumns = 2 | 3 | 4;

/** Substrate N×N → `.widget-mosaic--post-N`. Valid spans: W≤N, H≤N. */
export type WidgetMosaicSubstrate = 1 | 2 | 3 | 4;

export interface WidgetMosaicProps extends HTMLAttributes<HTMLElement> {
  /** Mosaic tiles — compose `WidgetTile` (span class map on the tile). */
  children?: ReactNode;
  /** Column count. Default 4 (bare `.widget-mosaic`). */
  columns?: WidgetMosaicColumns;
  /** Portrait export canvas → `.widget-mosaic--post` (1024×1280). */
  post?: boolean;
  /** Square export canvas → `.widget-mosaic--post-square` (1024×1024). */
  postSquare?: boolean;
  /** Substrate N×N → `.widget-mosaic--post-N`. */
  substrate?: WidgetMosaicSubstrate;
}

/**
 * Dashboard mosaic (`section.widget-mosaic`). Thin wrapper — markup SSOT:
 * `design-system/templates/widget-mosaic.html` / `css/widget-mosaic.css`.
 * Catalog: `preview/widgets.html#section-widget-tile` (same section as
 * `WidgetTile`; no separate mosaic catalog). Default 4 columns, gap
 * `--space-3`. Tile footprint is `.widget-tile--span-WxH` on children
 * (`WidgetTile` `span`), not `--layout-*`. Not `Grid`, not `Section`,
 * not collage-4x4 / placement-matrix / `--telegram` / Highcharts / nivo.
 */
export function WidgetMosaic({
  children,
  columns,
  post = false,
  postSquare = false,
  substrate,
  className,
  ...rest
}: WidgetMosaicProps) {
  return (
    <section
      className={cn(
        'widget-mosaic',
        (columns === 2 || columns === 3) && `widget-mosaic--${columns}`,
        post && 'widget-mosaic--post',
        postSquare && 'widget-mosaic--post-square',
        substrate != null && `widget-mosaic--post-${substrate}`,
        className,
      )}
      aria-label="Dashboard mosaic"
      {...rest}
    >
      {children}
    </section>
  );
}
