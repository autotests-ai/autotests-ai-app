import { useState } from 'react';
import type { PlaqueFieldSegOption } from './PlaqueFieldSeg';
import { cn } from './cn';

export type { PlaqueFieldSegOption };

/** At least three options — 2-opt stays on `PlaqueFieldSeg`. */
export type PlaqueFieldSegNOptions = readonly [
  PlaqueFieldSegOption,
  PlaqueFieldSegOption,
  PlaqueFieldSegOption,
  ...PlaqueFieldSegOption[],
];

export interface PlaqueFieldSegNProps {
  /** Config param id / caption rendered in the left label slot. */
  label: string;
  /**
   * N-opt segmented control (3+). Not the 2-opt boolean canon — that stays
   * on `PlaqueFieldSeg` (skill `configurator-boolean`).
   */
  options: PlaqueFieldSegNOptions;
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

/**
 * N-opt segmented control inside a divided plaque (`plaque-field-seg-track--many`).
 * Canon for 3+ value fields (e.g. `pyramidLayer` 7-opt) — buttons are a
 * `radiogroup`, never a native checkbox and never `PlaqueTagstrip` multi-select.
 * 2-opt (`true`/`false`, gradle/maven, …) stays on `PlaqueFieldSeg`. Shell
 * full-width; chips content-hug + flex-end — no `--stretch` class.
 */
export function PlaqueFieldSegN({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  paramId,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueFieldSegNProps) {
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
