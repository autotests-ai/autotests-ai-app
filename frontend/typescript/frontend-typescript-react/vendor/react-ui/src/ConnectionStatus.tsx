import type { HTMLAttributes } from 'react';
import { cn } from './cn';
import { IconDocumentRemove, IconDotsHorizontal } from './vnc-icons';

export type ConnectionState =
  | 'connecting'
  | 'disconnecting'
  | 'disconnected'
  | 'connected';

export interface ConnectionStatusProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** VNC lifecycle state. `connected` renders hidden (CSS). */
  state: ConnectionState;
}

/**
 * Non-interactive square lifecycle indicator for the VNC window.
 * Composes the `connection-status` primitive.
 */
export function ConnectionStatus({
  state,
  className,
  role = 'status',
  'aria-label': ariaLabel,
  ...rest
}: ConnectionStatusProps) {
  const glyph =
    state === 'connected' ? null : state === 'disconnected' ? (
      <IconDocumentRemove />
    ) : (
      <IconDotsHorizontal />
    );

  return (
    <span
      role={role}
      aria-label={ariaLabel ?? `VNC ${state}`}
      className={cn('connection-status', `connection-status--${state}`, className)}
      {...rest}
    >
      {glyph && (
        <span className="icon" aria-hidden="true">
          {glyph}
        </span>
      )}
    </span>
  );
}
