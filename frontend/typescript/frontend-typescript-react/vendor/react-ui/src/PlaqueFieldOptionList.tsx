import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface PlaqueFieldOption {
  /** Wire value (mapped to `data-value`); active state compares against this. */
  value: string;
  /** Button caption. Defaults to `value`. */
  label?: ReactNode;
  /** Native `title` tooltip. */
  title?: string;
}

/**
 * O-legend 3–5 exclusive options (`rootLogLevel`). Not 2-opt (`PlaqueFieldSeg`),
 * not N-opt chips (`PlaqueFieldSegN`), not multi-select (`PlaqueTagstrip`).
 */
export type PlaqueFieldOptionListOptions =
  | readonly [PlaqueFieldOption, PlaqueFieldOption, PlaqueFieldOption]
  | readonly [PlaqueFieldOption, PlaqueFieldOption, PlaqueFieldOption, PlaqueFieldOption]
  | readonly [
      PlaqueFieldOption,
      PlaqueFieldOption,
      PlaqueFieldOption,
      PlaqueFieldOption,
      PlaqueFieldOption,
    ];

export interface PlaqueFieldOptionListProps {
  /**
   * 3–5 exclusive options. Canon: configurator `rootLogLevel`
   * (`trace` / `debug` / `info` / `warn` / `error`).
   */
  options: PlaqueFieldOptionListOptions;
  /** Controlled selected value. */
  value?: string;
  /** Uncontrolled initial value (defaults to the first option). */
  defaultValue?: string;
  /** Fired with the newly selected option value. */
  onValueChange?: (value: string) => void;
  /** `data-param-id` for wiring / e2e (`syncControlButtons`). */
  paramId?: string;
  /** Accessible group name; defaults to `paramId`. */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * O-legend 3–5 option radiogroup (`plaque-field-list--dense` +
 * `plaque-field-option` / `--on`). Canon for `rootLogLevel` — buttons are a
 * `radiogroup`, never a native `<input type="radio">`, never `PlaqueFieldSeg` /
 * `PlaqueFieldSegN` chips, never `PlaqueTagstrip` multi-select. Dense stacked
 * rows, not a divided plaque (magnet does not apply to this list).
 */
export function PlaqueFieldOptionList({
  options,
  value,
  defaultValue,
  onValueChange,
  paramId,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueFieldOptionListProps) {
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
      className={cn('plaque-field-list', 'plaque-field-list--dense', className)}
      role="radiogroup"
      aria-label={ariaLabel ?? paramId}
      data-param-id={paramId}
      data-testid={testId}
    >
      {options.map((option) => {
        const on = option.value === selected;
        return (
          <button
            key={option.value}
            type="button"
            className={cn('plaque-field-option', on && 'plaque-field-option--on')}
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
  );
}
