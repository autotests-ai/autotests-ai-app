import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from './cn';

export const POLL_DEFAULT_MS = 5000;

export interface PollToggleProps {
  className?: string;
  testId?: string;
  labelTestId?: string;
  /** Poll interval in ms. Default 5000. */
  intervalMs?: number;
  /** Initial pressed/on state. Default true. */
  defaultOn?: boolean;
  /** Controlled on state. */
  on?: boolean;
  /** Called on each tick while polling is on (not on mount unless `tickOnMount`). */
  onTick?: () => void;
  /** Called when the user toggles auto-refresh. */
  onChange?: (on: boolean) => void;
  /** Fire `onTick` once when polling starts (including defaultOn). Default false. */
  tickOnMount?: boolean;
}

export function formatPollLabel(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? Math.round(ms) : POLL_DEFAULT_MS;
  if (safe % 1000 === 0) return `${safe / 1000}s`;
  return `${safe}ms`;
}

export function PollIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function PollToggle({
  className,
  testId = 'poll-toggle',
  labelTestId,
  intervalMs = POLL_DEFAULT_MS,
  defaultOn = true,
  on: onProp,
  onTick,
  onChange,
  tickOnMount = false,
}: PollToggleProps) {
  const [uncontrolledOn, setUncontrolledOn] = useState(defaultOn);
  const on = onProp ?? uncontrolledOn;
  const label = formatPollLabel(intervalMs);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!on) {
      startedRef.current = false;
      return undefined;
    }
    if (tickOnMount && !startedRef.current) {
      startedRef.current = true;
      onTickRef.current?.();
    }
    const timer = window.setInterval(() => {
      onTickRef.current?.();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [on, intervalMs, tickOnMount]);

  const toggle = useCallback(() => {
    const next = !on;
    if (onProp === undefined) {
      setUncontrolledOn(next);
    }
    onChange?.(next);
    if (next) {
      onTickRef.current?.();
    }
  }, [on, onProp, onChange]);

  return (
    <span className={cn('poll-toggle', on && 'poll-toggle--on', className)} data-testid={testId}>
      <button
        type="button"
        className="icon-btn"
        data-testid={`${testId}-btn`}
        data-poll-ms={intervalMs}
        aria-pressed={on}
        aria-label={on ? `Stop auto-refresh (${label})` : `Start auto-refresh (${label})`}
        onClick={toggle}
      >
        <span className="icon" aria-hidden="true">
          <PollIcon />
        </span>
      </button>
      <span
        className="poll-toggle__label"
        data-testid={labelTestId ?? `${testId}-label`}
        aria-hidden="true"
      >
        {label}
      </span>
    </span>
  );
}
