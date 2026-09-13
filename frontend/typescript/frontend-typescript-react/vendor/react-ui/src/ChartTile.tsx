import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface ChartTileProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Visible heading → `h3.chart-tile__title`. */
  title: ReactNode;
  /** Chart host → `div.chart-tile__body`. Empty is a valid mount slot. */
  children?: ReactNode;
  /** Body `id` — template mount is `chart-slot`. */
  bodyId?: string;
  /** Body `data-testid` — catalog is `chart-tile-body-demo`. */
  bodyTestId?: string;
}

/**
 * Chart host (`div.chart-tile` + `h3.chart-tile__title` + `div.chart-tile__body`).
 * Thin wrapper — markup SSOT: `design-system/templates/chart-tile.html` /
 * `css/chart-tile.css`. Catalog: `preview/widgets.html#section-chart-tile`.
 * min-height 168 / body 140; radius `--radius-md`. Body is always rendered
 * (mount slot). Not `WidgetTile`, not Highcharts, not sparkline / QG / tests-table.
 */
export function ChartTile({
  title,
  className,
  children,
  bodyId,
  bodyTestId,
  ...rest
}: ChartTileProps) {
  return (
    <div className={cn('chart-tile', className)} {...rest}>
      <h3 className="chart-tile__title">{title}</h3>
      <div className="chart-tile__body" id={bodyId} data-testid={bodyTestId}>
        {children}
      </div>
    </div>
  );
}
