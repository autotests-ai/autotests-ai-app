import type { HTMLAttributes, ReactNode } from 'react';
import { Children } from 'react';
import { cn } from './cn';

export type SectionTitleAs = 'h2' | 'h3';

export interface SectionProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Visible heading → `h2.section__title` (catalog sticky → `h3`). */
  title?: ReactNode;
  /** Optional lead → `p.section__desc`. Empty / omitted → no node. */
  description?: ReactNode;
  /** Sticky aside → `.section--sticky` (CSS in `sticky.css` via `section.css`; not JS). */
  sticky?: boolean;
  /** Heading tag. Default `h2`; catalog sticky panel uses `h3`. */
  titleAs?: SectionTitleAs;
  children?: ReactNode;
}

/**
 * Layout block (`section.section`). Thin wrapper — markup SSOT:
 * `design-system/templates/section.html` / `css/section.css`.
 * Catalog: `preview/chrome.html#section-section`.
 * Sticky is `.section--sticky` (CSS primitive, ≥769px) — not JS, not `Panel`.
 * Not `Grid`, `Stack`, `FieldCaption`, `Label`, `Text`, `PlaqueFieldGrid`,
 * `plaque-field-grid-stack`.
 */
export function Section({
  title,
  description,
  sticky = false,
  titleAs = 'h2',
  className,
  children,
  ...rest
}: SectionProps) {
  const Heading = titleAs;
  const hasTitle = title != null && title !== '';
  const hasDescription = description != null && description !== '';
  const hasBody = Children.toArray(children).length > 0;

  return (
    <section
      className={cn('section', sticky && 'section--sticky', className)}
      {...rest}
    >
      {hasTitle ? <Heading className="section__title">{title}</Heading> : null}
      {hasDescription ? <p className="section__desc">{description}</p> : null}
      {hasBody ? <div className="section__body">{children}</div> : null}
    </section>
  );
}
