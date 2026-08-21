import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface PlaqueFieldSegOption {
  /** Wire value (mapped to `data-value`); active state compares against this. */
  value: string;
  /** Button caption. Defaults to `value`. */
  label?: ReactNode;
  /** Native `title` tooltip (long forms of short captions). */
  title?: string;
}

export interface PlaqueFieldSegProps {
  /** Config param id / caption rendered in the left label slot. */
  label: string;
  /**
   * Exactly two options for a 2-opt segmented control. Defaults to the boolean
   * `true` / `false` canon (skill `configurator-boolean`).
   */
  options?: readonly [PlaqueFieldSegOption, PlaqueFieldSegOption];
  /** Controlled selected value. */
  value?: string;
  /** Uncontrolled initial value (defaults to the first option). */
  defaultValue?: string;
  /** Fired with the newly selected option value. */
  onValueChange?: (value: string) => void;
  /** `data-param-id` for wiring / e2e (`syncControlButtons`). */
  paramId?: string;
  /** Accessible group name; defaults to `label`. */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

const DEFAULT_OPTIONS: readonly [PlaqueFieldSegOption, PlaqueFieldSegOption] = [
  { value: 'true' },
  { value: 'false' },
];

/**
 * 2-opt segmented control inside a divided plaque (`plaque-field-seg-track--many`).
 * Canon for any two-value field, including boolean `true` / `false`
 * (skill `configurator-boolean`) — buttons are a `radiogroup`, never a native
 * checkbox. Shell full-width; chips content-hug + flex-end — no `--stretch`
 * class (that class stretches select/input controls only).
 */
export function PlaqueFieldSeg({
  label,
  options = DEFAULT_OPTIONS,
  value,
  defaultValue,
  onValueChange,
  paramId,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueFieldSegProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    () => defaultValue ?? options[0].value,
  );
  const selected = isControlled ? value : internalValue;

  const select = (next: string) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

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
        <div className="plaque-field-seg" role="radiogroup" aria-label={ariaLabel ?? label}>
          {options.map((option) => {
            const on = option.value === selected;
            return (
              <button
                key={option.value}
                type="button"
                className={cn('plaque-field-seg__btn', on && 'plaque-field-seg__btn--on')}
                data-value={option.value}
                aria-pressed={on}
                title={option.title}
                onClick={() => select(option.value)}
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
