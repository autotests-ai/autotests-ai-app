import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type SelenoidMetricsVariant = 'header' | 'tile';

export interface SelenoidMetricsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Used capacity percent (shown with `%` unit). */
  usedPercent: number;
  queued: number;
  /** Ready warm-pool slots (shown as `ready / total`). */
  warmReady: number;
  /** Configured warm-pool size. */
  warmTotal: number;
  /** Ready hot-pool slots (shown as `ready / total`). Missing data → `0 / 0`, slot stays visible. */
  hotReady?: number;
  /** Configured hot-pool size. */
  hotTotal?: number;
  quotaUsed: number;
  quotaPending: number;
  quotaTotal: number;
  /** Layout shell: `header` (slot) or `tile` (dashboard). Defaults to `header`. */
  variant?: SelenoidMetricsVariant;
  'data-testid'?: string;
}

export function SelenoidMetrics({
  usedPercent,
  queued,
  warmReady,
  warmTotal,
  hotReady = 0,
  hotTotal = 0,
  quotaUsed,
  quotaPending,
  quotaTotal,
  variant = 'header',
  className,
  'aria-label': ariaLabel = 'Hub metrics',
  'data-testid': dataTestId = 'selenoid-metrics',
  ...rest
}: SelenoidMetricsProps) {
  return (
    <div
      role="group"
      className={cn('selenoid-metrics', `selenoid-metrics--${variant}`, className)}
      data-testid={dataTestId}
      aria-label={ariaLabel}
      {...rest}
    >
      <div className="selenoid-metrics__item" data-testid="selenoid-metrics-used">
        <span className="selenoid-metrics__label">Used</span>
        <span className="selenoid-metrics__value">
          {usedPercent}
          <span className="selenoid-metrics__unit">%</span>
        </span>
      </div>
      <span className="plaque-divider" aria-hidden="true" />
      <div className="selenoid-metrics__item" data-testid="selenoid-metrics-queued">
        <span className="selenoid-metrics__label">Queued</span>
        <span className="selenoid-metrics__value">{queued}</span>
      </div>
      <span className="plaque-divider" aria-hidden="true" />
      <div className="selenoid-metrics__item" data-testid="selenoid-metrics-warm">
        <span className="selenoid-metrics__label">Warm</span>
        <span className="selenoid-metrics__value">
          {warmReady}
          <span className="selenoid-metrics__quota-sep"> / </span>
          {warmTotal}
        </span>
      </div>
      <span className="plaque-divider" aria-hidden="true" />
      <div className="selenoid-metrics__item" data-testid="selenoid-metrics-hot">
        <span className="selenoid-metrics__label">Hot</span>
        <span className="selenoid-metrics__value">
          {hotReady}
          <span className="selenoid-metrics__quota-sep"> / </span>
          {hotTotal}
        </span>
      </div>
      <span className="plaque-divider" aria-hidden="true" />
      <div className="selenoid-metrics__item" data-testid="selenoid-metrics-quota">
        <span className="selenoid-metrics__label">Quota</span>
        <span className="selenoid-metrics__value">
          {quotaUsed}
          <span className="selenoid-metrics__quota-sep"> + </span>
          <span className="selenoid-metrics__quota-pending">{quotaPending}</span>
          <span className="selenoid-metrics__quota-sep"> / </span>
          {quotaTotal}
        </span>
      </div>
    </div>
  );
}
