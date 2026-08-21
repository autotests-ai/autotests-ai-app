import type { ReactNode } from 'react';
import { cn } from './cn';

export interface PlaqueTagstripOption {
  /** Wire value (mapped to `data-value`); membership compares against this. */
  value: string;
  /** Button caption. Defaults to `value`. */
  label?: ReactNode;
  /** Native `title` tooltip. */
  title?: string;
}

export interface PlaqueTagstripProps {
  /** Config param id / caption rendered in the left label slot. */
  label: string;
  options: readonly PlaqueTagstripOption[];
  /** Currently selected values (multi-select). */
  values: readonly string[];
  /** Fired with the toggled option value (add if absent, remove if present). */
  onToggle: (value: string) => void;
  /** `data-param-id` for wiring / e2e. */
  paramId?: string;
  /** Accessible group name; defaults to `label`. */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Multi-select tag row inside a divided plaque (`plaque-field-seg-track--many`).
 * Canon: driver `images` row — pill buttons with per-button `aria-pressed`
 * (`role="group"`, **not** a radiogroup and **not** a native checkbox — that is
 * `plaque-field-checkstrip`). Thin wrapper; slots stay SSOT in `plaque-field-seg.css`.
 */
export function PlaqueTagstrip({
  label,
  options,
  values,
  onToggle,
  paramId,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueTagstripProps) {
  return (
    <div
      className={cn('plaque-field', 'plaque-field--divided', className)}
      data-param-id={paramId}
      data-testid={testId}
    >
      <span className="plaque-field__label" title={label}>
        {label}
      </span>
      <span className="plaque-divider" aria-hidden="true" />
      <div className="plaque-field-seg-track plaque-field-seg-track--many plaque-field__control">
        <div className="plaque-field-seg" role="group" aria-label={ariaLabel ?? label}>
          {options.map((option) => {
            const on = values.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={cn('plaque-field-seg__btn', on && 'plaque-field-seg__btn--on')}
                data-value={option.value}
                aria-pressed={on}
                title={option.title}
                onClick={() => onToggle(option.value)}
              >
                {option.label ?? option.value}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
