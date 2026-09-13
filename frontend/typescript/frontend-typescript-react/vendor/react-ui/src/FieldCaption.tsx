import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface FieldCaptionProps extends HTMLAttributes<HTMLDivElement> {
  /** Hint under the control → `p.field-caption__text`. Empty / omitted → no node. */
  caption?: ReactNode;
  /** Control slot (first child). Any field primitive. */
  children?: ReactNode;
}

/**
 * Control + caption (`div.field-caption`). Thin wrapper — markup SSOT:
 * `design-system/templates/field-caption.html` / `css/field-caption.css`.
 * Catalog: `preview/primitives.html#section-field-caption`.
 * Root is `div` (not `p.field-caption` + `span`). Caption is
 * `p.field-caption__text` (omit empty). Not `Label`, `Text`, `PlaqueField`.
 */
export function FieldCaption({
  caption,
  className,
  children,
  ...rest
}: FieldCaptionProps) {
  const hasCaption = caption != null && caption !== '';

  return (
    <div className={cn('field-caption', className)} {...rest}>
      {children}
      {hasCaption ? <p className="field-caption__text">{caption}</p> : null}
    </div>
  );
}
