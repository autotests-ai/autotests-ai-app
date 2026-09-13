import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Associated control id → HTML `for`. */
  htmlFor: string;
  /** Visible label text. Do not wrap the field. */
  children?: ReactNode;
}

/**
 * Form label (`label.label`). Thin wrapper — markup SSOT:
 * `design-system/templates/label.html` / `css/label.css`.
 * Catalog: `preview/primitives.html#section-label`.
 * Associates via `htmlFor` / `for`; children are text only
 * (sibling field, not wrapped). Not `FieldCaption`, `Text`, `Input`.
 */
export function Label({ className, children, ...rest }: LabelProps) {
  return (
    <label className={cn('label', className)} {...rest}>
      {children}
    </label>
  );
}
