import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { cn } from './cn';

export interface PlaqueNumberProps {
  /** Config param id / caption rendered in the left label slot. */
  label: string;
  /** Controlled numeric value. */
  value?: number;
  /** Uncontrolled initial value. */
  defaultValue?: number;
  min?: number;
  max?: number;
  /** Native `step`. Defaults to `1` (canon `headerHeight`). */
  step?: number;
  /** Fired with the new number after typing or a ± click. */
  onChange?: (value: number) => void;
  /** `data-param-id` for wiring / e2e. */
  paramId?: string;
  disabled?: boolean;
  /** Fill the row (3-col grid). Default true — CSS places `.plaque-number` in column 3. */
  stretch?: boolean;
  id?: string;
  /** Accessible name for the spinbutton; defaults to `label`. */
  'aria-label'?: string;
  className?: string;
  /** Catalog / template id. Defaults to `plaque-field-number`. */
  'data-testid'?: string;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function stepValue(
  current: number | undefined,
  dir: number,
  step: number,
  min: number | undefined,
  max: number | undefined,
): number {
  const stepVal = Number.isFinite(step) && step > 0 ? step : 1;
  const minB = finiteOr(min, -Infinity);
  const maxB = finiteOr(max, Infinity);
  let next = (current === undefined || !Number.isFinite(current) ? 0 : current) + dir * stepVal;
  if (Number.isFinite(minB)) next = Math.max(minB, next);
  if (Number.isFinite(maxB)) next = Math.min(maxB, next);
  return next;
}

function PlaqueNumberGlyph({ dir }: { dir: -1 | 1 }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path
        d={dir < 0 ? 'M2 5h6' : 'M2 5h6M5 2v6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Divided stretch plaque with a ± number stepper (`span.plaque-number` +
 * `input.plaque-field__control`). Canon: `templates/plaque-field.html`
 * `plaque-field-number` / `preview/fields.html#section-plaque-field`
 * (`headerHeight` 22, min 16, max 120). Thin wrapper — slots stay SSOT in
 * `plaque-field.css` (imports `plaque-number.css`). Not `PlaqueField` text.
 */
export function PlaqueNumber({
  label,
  value,
  defaultValue,
  min,
  max,
  step = 1,
  onChange,
  paramId,
  disabled,
  stretch = true,
  id,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId = 'plaque-field-number',
}: PlaqueNumberProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const current = isControlled ? value : internalValue;
  const controlId = id ?? paramId;
  const controlName = paramId ?? id;
  const numeric = current !== undefined && Number.isFinite(current) ? current : NaN;
  const minB = finiteOr(min, -Infinity);
  const maxB = finiteOr(max, Infinity);
  const decDisabled =
    Boolean(disabled) || (Number.isFinite(numeric) && Number.isFinite(minB) && numeric <= minB);
  const incDisabled =
    Boolean(disabled) || (Number.isFinite(numeric) && Number.isFinite(maxB) && numeric >= maxB);

  const commit = (next: number) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.valueAsNumber;
    if (!Number.isFinite(next)) {
      return;
    }
    commit(next);
  };

  const handleStep = (dir: -1 | 1) => {
    if (disabled) return;
    commit(stepValue(current, dir, step, min, max));
  };

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
      <span className="plaque-number">
        <button
          type="button"
          className="plaque-number__btn"
          data-plaque-number-dir="-1"
          tabIndex={-1}
          aria-label="Уменьшить"
          disabled={decDisabled}
          onClick={(event) => {
            event.preventDefault();
            handleStep(-1);
          }}
        >
          <PlaqueNumberGlyph dir={-1} />
        </button>
        <input
          id={controlId}
          name={controlName}
          type="number"
          className="plaque-field__control"
          value={current === undefined ? '' : current}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          autoComplete={paramId ? 'off' : undefined}
          onChange={handleInputChange}
        />
        <button
          type="button"
          className="plaque-number__btn"
          data-plaque-number-dir="1"
          tabIndex={-1}
          aria-label="Увеличить"
          disabled={incDisabled}
          onClick={(event) => {
            event.preventDefault();
            handleStep(1);
          }}
        >
          <PlaqueNumberGlyph dir={1} />
        </button>
      </span>
    </label>
  );
}
