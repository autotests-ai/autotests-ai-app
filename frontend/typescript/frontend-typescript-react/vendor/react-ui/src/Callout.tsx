import type { HTMLAttributes, ReactNode } from 'react';
import { Children } from 'react';
import { cn } from './cn';

export type CalloutTone = 'warning' | 'success';

export interface CalloutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Colour family → `.callout--warning` / `.callout--success`. */
  tone: CalloutTone;
  /** Visible heading → `p.callout__title`. */
  title?: ReactNode;
  /** List items (`<li>…</li>`), wrapped in `ul.callout__list`. */
  children?: ReactNode;
}

/**
 * Warning / success block (`div.callout` + `--warning` / `--success`).
 * Thin wrapper — markup SSOT: `design-system/templates/callout.html` /
 * `css/callout.css`. Catalog: `preview/chrome.html#section-callout`.
 * Empty root is CSS-hidden (`:empty`). Not `Badge`, `Status`, `StatusTile`,
 * `Indicator`, `Panel`.
 */
export function Callout({
  tone,
  title,
  className,
  role = 'status',
  children,
  ...rest
}: CalloutProps) {
  const hasTitle = title != null && title !== '';
  const hasList = Children.toArray(children).length > 0;

  return (
    <div
      className={cn('callout', `callout--${tone}`, className)}
      role={role}
      {...rest}
    >
      {hasTitle ? <p className="callout__title">{title}</p> : null}
      {hasList ? <ul className="callout__list">{children}</ul> : null}
    </div>
  );
}
