import type { ChangeEventHandler, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { Input } from './Input';
import { Textarea } from './Textarea';

export type PlaqueFieldLabelVariant = 'param' | 'caption';
export type PlaqueFieldControlElement = HTMLInputElement | HTMLTextAreaElement;

/** Configurator param ids with credential-style browser autofill tokens. */
const PARAM_AUTOCOMPLETE: Partial<Record<string, string>> = {
  authUser: 'username',
  authPass: 'current-password',
};

function resolveAutoComplete(
  autoComplete: string | undefined,
  paramId: string | undefined,
  labelVariant: PlaqueFieldLabelVariant,
): string | undefined {
  if (autoComplete !== undefined) {
    return autoComplete;
  }
  if (!paramId) {
    return undefined;
  }
  if (PARAM_AUTOCOMPLETE[paramId]) {
    return PARAM_AUTOCOMPLETE[paramId];
  }
  if (labelVariant === 'param') {
    return 'off';
  }
  return undefined;
}

type PlaqueFieldShared = {
  label: string;
  className?: string;
  divided?: boolean;
  stretch?: boolean;
  /** `data-param-id` for wiring / e2e. */
  paramId?: string;
  /**
   * `param` → `.plaque-field__label` (configurator ids: `name`, `remoteUrl`).
   * `caption` → `.plaque-field__text` (auth human captions: Login / Password).
   */
  labelVariant?: PlaqueFieldLabelVariant;
  onChange?: ChangeEventHandler<PlaqueFieldControlElement>;
};

export type PlaqueFieldProps = PlaqueFieldShared &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onChange'> &
  Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & {
    /** `textarea` control — note body / comments. Default is single-line `input`. */
    multiline?: boolean;
  };

/**
 * Divided plaque with a text `input` or `textarea` control. Canon:
 * - param id + input → `templates/plaque-field.html` `plaque-field-text`
 * - human caption + input → `plaque-field-caption-input`
 * - human caption + textarea → `plaque-field-textarea`
 * Thin wrapper — label / divider / control slots stay SSOT in `plaque-field.css`.
 */
export function PlaqueField({
  label,
  className,
  divided = true,
  stretch = true,
  paramId,
  labelVariant = 'caption',
  id,
  name,
  autoComplete,
  multiline = false,
  rows = 3,
  onChange,
  type,
  ...inputProps
}: PlaqueFieldProps) {
  const labelClass =
    labelVariant === 'param' ? 'plaque-field__label' : 'plaque-field__text';
  // Autofill / DevTools: form controls need id or name. Prefer explicit props,
  // then configurator paramId (Capabilities / remote-hub).
  const controlId = id ?? paramId;
  const controlName = name ?? paramId ?? id;
  const resolvedAutoComplete = resolveAutoComplete(
    autoComplete,
    paramId,
    labelVariant,
  );

  return (
    <label
      className={cn(
        'plaque-field',
        divided && 'plaque-field--divided',
        stretch && 'plaque-field--stretch',
        className,
      )}
      data-param-id={paramId}
    >
      <span className={labelClass} title={labelVariant === 'param' ? label : undefined}>
        {label}
      </span>
      {divided ? <span className="plaque-divider" aria-hidden="true" /> : null}
      {multiline ? (
        <Textarea
          className="plaque-field__control"
          {...(inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={controlId}
          name={controlName}
          rows={rows}
          autoComplete={resolvedAutoComplete}
          onChange={onChange}
        />
      ) : (
        <Input
          className="plaque-field__control"
          {...inputProps}
          type={type}
          id={controlId}
          name={controlName}
          autoComplete={resolvedAutoComplete}
          onChange={onChange as ChangeEventHandler<HTMLInputElement> | undefined}
        />
      )}
    </label>
  );
}
