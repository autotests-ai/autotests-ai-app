import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/** Consumer shorthand → primitive modifier (`status-tile--*`). */
export type StatusTileStatus = 'ok' | 'stale' | 'error' | 'disconnected';

export type StatusTileVariant = 'header' | 'tile';

export type StatusTileModifier =
  | 'connected'
  | 'stale'
  | 'error'
  | 'disconnected';

const statusToModifier: Record<StatusTileStatus, StatusTileModifier> = {
  ok: 'connected',
  stale: 'stale',
  error: 'error',
  disconnected: 'disconnected',
};

export interface StatusTileProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Upper label (e.g. `SSE`, `Selenoid`). */
  label: string;
  /** Visible state text (e.g. `Connected`, `Stale`). */
  state: string;
  /**
   * Maps to `status-tile--connected` / `--stale` / `--error` / `--disconnected`.
   * `ok` → `--connected`. Defaults to `ok`.
   */
  status?: StatusTileStatus;
  /** Layout shell: `header` (slot) or `tile` (dashboard). Defaults to `tile`. */
  variant?: StatusTileVariant;
  'data-testid'?: string;
}

export function StatusTile({
  label,
  state,
  status = 'ok',
  variant = 'tile',
  id,
  className,
  title,
  'aria-label': ariaLabel,
  'data-testid': dataTestId = 'status-tile',
  ...rest
}: StatusTileProps) {
  const modifier = statusToModifier[status];

  return (
    <div
      id={id}
      role="status"
      className={cn(
        'status-tile',
        `status-tile--${modifier}`,
        `status-tile--${variant}`,
        className,
      )}
      data-testid={dataTestId}
      title={title}
      aria-label={ariaLabel ?? state}
      {...rest}
    >
      <span className="status-tile__label">{label}</span>
      <span className="status-tile__state">{state}</span>
    </div>
  );
}
