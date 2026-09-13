import type { HTMLAttributes } from 'react';
import { cn } from './cn';
import { SelenoidMetrics, type SelenoidMetricsProps } from './SelenoidMetrics';
import { StatusTile, type StatusTileProps } from './StatusTile';

export type SelenoidDashboardRowTileProps = Omit<StatusTileProps, 'variant'>;

export type SelenoidDashboardRowMetricsProps = Omit<
  SelenoidMetricsProps,
  'variant'
>;

export interface SelenoidDashboardRowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** SSE tile — `StatusTile` `variant="tile"` (template `sse-status`). */
  sse: SelenoidDashboardRowTileProps;
  /** Hub tile — `StatusTile` `variant="tile"` (template `selenoid-status`). */
  selenoid: SelenoidDashboardRowTileProps;
  /** Hub metrics — `SelenoidMetrics` `variant="tile"` (no row-level dividers). */
  metrics: SelenoidDashboardRowMetricsProps;
  'data-testid'?: string;
}

/**
 * Dashboard status + metrics row (`div.selenoid-dashboard-row`). Thin
 * wrapper — markup SSOT: `design-system/templates/selenoid-dashboard-row.html`
 * / `css/selenoid-metrics.css`. Catalog:
 * `preview/session.html#section-selenoid-metrics`
 * (`selenoid-dashboard-row-demo`). Composes `StatusTile` `--tile` ×2 +
 * `SelenoidMetrics` `--tile`. No `PlaqueDivider` between tiles (dividers
 * stay inside metrics). Not `selenoid-header-group`, not `QgInfo`, not
 * `SessionKill`.
 */
export function SelenoidDashboardRow({
  sse,
  selenoid,
  metrics,
  className,
  'data-testid': dataTestId = 'selenoid-dashboard-row',
  ...rest
}: SelenoidDashboardRowProps) {
  return (
    <div
      className={cn('selenoid-dashboard-row', className)}
      data-testid={dataTestId}
      {...rest}
    >
      <StatusTile data-testid="sse-status" {...sse} variant="tile" />
      <StatusTile data-testid="selenoid-status" {...selenoid} variant="tile" />
      <SelenoidMetrics {...metrics} variant="tile" />
    </div>
  );
}
