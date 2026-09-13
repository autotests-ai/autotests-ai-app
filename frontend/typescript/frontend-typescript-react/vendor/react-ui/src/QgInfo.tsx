import type { HTMLAttributes } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { cn } from './cn';
import {
  createQgInfo,
  type QgInfoFileSource,
} from './qg-info-canon.js';

export type { QgInfoFileSource };

export interface QgInfoProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'content'> {
  /** JSON payload or source string → `createQgInfo`. */
  content: string | Record<string, unknown>;
  /** Path rows (config / rules / known / profile / project). */
  fileSource?: QgInfoFileSource;
  'data-testid'?: string;
}

/**
 * Quality gate info icon + popover (`div.qg-info`).
 * Thin wrapper — markup SSOT: `design-system/templates/qg-info.html` /
 * `css/qg-info.css`. Embed SSOT: `createQgInfo` in `js/qg-info.js`
 * (hover / pin / `--open` / `--pinned` stay in the primitive — not a React
 * rewrite). Catalog: `preview/widgets.html#section-qg-info` (`qg-info-demo`).
 * Template + default `data-testid="qg-info"`. Host:
 * `div.qg-info` > `button.icon-btn.qg-info__trigger` (aria-label
 * «Quality gate config») + `div.qg-info__popover` (`ul.qg-info__paths`
 * config / rules / known + `pre.qg-info__code`). Live node is a sibling of
 * a hidden React slot so `QualityGate` `.quality-gate__bar > .qg-info`
 * (canon / CSS) holds. Not QualityGate / SonarQualityGate / PlaqueField /
 * PlaqueNumber / WidgetTile / Sparkline / CodeHighlight / variants /
 * configurator-layout.
 */
export function QgInfo({
  content,
  fileSource,
  className,
  'data-testid': dataTestId = 'qg-info',
  ...rest
}: QgInfoProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const parent = host?.parentNode;
    if (!host || !parent) {
      return undefined;
    }
    const node = createQgInfo(content, fileSource);
    node.dataset.testid = dataTestId;
    if (className) {
      node.className = cn(node.className, className);
    }
    parent.insertBefore(node, host);
    return () => {
      node.remove();
    };
  }, [content, fileSource, className, dataTestId]);

  return <div ref={hostRef} {...rest} hidden />;
}
