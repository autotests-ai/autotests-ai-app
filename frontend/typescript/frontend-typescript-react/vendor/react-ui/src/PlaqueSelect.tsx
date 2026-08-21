import type { ChangeEvent, ReactNode } from 'react';
import { cn } from './cn';

export interface PlaqueSelectOption {
  /** Wire value (`<option value>`). */
  value: string;
  /** Visible caption. Defaults to `value`. */
  label?: ReactNode;
}

export interface PlaqueSelectProps {
  /** Config param id / caption rendered in the left label slot. */
  label: string;
  /** Controlled selected value. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  options: readonly PlaqueSelectOption[];
  /** Fired with the newly selected option value. */
  onChange?: (value: string) => void;
  /** `data-param-id` for wiring / e2e. */
  paramId?: string;
  disabled?: boolean;
  /** Fill the row (3-col grid) instead of content-hug (default true — canon `plaque-field-select`). */
  stretch?: boolean;
  id?: string;
  /** Accessible name; defaults to `label`. */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Divided plaque with a native `select` control (`select.plaque-field__control`).
 * Canon: `templates/plaque-field.html` → `plaque-field-select`. Thin wrapper —
 * the label / divider / control slots stay SSOT in `plaque-field.css`.
 */
export function PlaqueSelect({
  label,
  value,
  defaultValue,
  options,
  onChange,
  paramId,
  disabled,
  stretch = true,
  id,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event.target.value);
  };
  const controlId = id ?? paramId;
  const controlName = paramId ?? id;

  return (
    <label
      className={cn(
        'plaque-field',
        'plaque-field--divided',
        stretch && 'plaque-field--stretch',
        className,
      )}
      data-param-id={paramId}
      data-testid={testId}
    >
      <span className="plaque-field__label" title={label}>
        {label}
      </span>
      <span className="plaque-divider" aria-hidden="true" />
      <select
        className="plaque-field__control"
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onChange={handleChange}
        id={controlId}
        name={controlName}
        autoComplete={paramId ? 'off' : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
    </label>
  );
}
