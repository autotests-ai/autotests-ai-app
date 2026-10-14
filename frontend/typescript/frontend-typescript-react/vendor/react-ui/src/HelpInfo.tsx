import type { HTMLAttributes } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { cn } from './cn';
import {
  createHelpInfo,
  type HelpInfoItem,
} from './help-info-canon.js';

export type { HelpInfoItem };

export interface HelpInfoProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Title/body rows → `createHelpInfo` / `mountHelpInfo`. */
  items: readonly HelpInfoItem[];
  /** Popover heading (`.help-info__heading`). Omit for list-only. */
  title?: string;
  /** Trigger + dialog name. Default: `title` or `Help`. */
  ariaLabel?: string;
  'data-testid'?: string;
}

/**
 * Help icon + title/body popover (`div.help-info`).
 * Thin wrapper — markup SSOT: `design-system/templates/help-info.html` /
 * `css/help-info.css`. Embed SSOT: `createHelpInfo` / `mountHelpInfo` in
 * `js/help-info.js` (hover / pin / `--open` / `--pinned` stay in the
 * primitive — not a React rewrite). Catalog:
 * `preview/primitives.html#section-help-info` (`help-info` 36×36;
 * `.panel__bar` compose 28×28). Template + default
 * `data-testid="help-info"`. Host: `div.help-info` >
 * `button.icon-btn.help-info__trigger` + body-mounted
 * `div.help-info__popover` (`p.help-info__heading` + `ul.help-info__list`
 * title/body). Live node is a sibling of a hidden React slot so
 * `.panel__bar-end > .help-info` (canon / CSS) holds. Not QgInfo /
 * QualityGate / IconBtn / PollToggle / ThemeToggle / LangToggle.
 */
export function HelpInfo({
  items,
  title,
  ariaLabel,
  className,
  'data-testid': dataTestId = 'help-info',
  ...rest
}: HelpInfoProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const parent = host?.parentNode;
    if (!host || !parent) {
      return undefined;
    }
    const { root, dispose } = createHelpInfo({
      items: [...items],
      title,
      ariaLabel,
      testid: dataTestId,
    });
    if (className) {
      root.className = cn(root.className, className);
    }
    parent.insertBefore(root, host);
    return () => {
      dispose();
      root.remove();
    };
  }, [items, title, ariaLabel, className, dataTestId]);

  return <div ref={hostRef} {...rest} hidden />;
}
