import type { HTMLAttributes } from 'react';
import { cn } from './cn';
import { highlightOutput, type HighlightKind } from './code-highlight';

const DEFAULT_LABEL: Record<HighlightKind, string> = {
  json: 'JSON',
  shell: 'Shell',
  curl: 'curl',
  markdown: 'Markdown',
  plain: 'Code',
};

export interface CodeHighlightProps
  extends Omit<HTMLAttributes<HTMLPreElement>, 'children'> {
  /** Source text → `highlightOutput` (trimmed; always escaped / token HTML). */
  code: string;
  /** Highlighter route. Default `json` (catalog / template). */
  kind?: HighlightKind;
  /** Uncolored fallback → `.ch-code--plain` + `kind: 'plain'`. */
  plain?: boolean;
}

/**
 * Highlighted `<pre class="ch-code">`. Thin wrapper — markup SSOT:
 * `design-system/templates/code-highlight.html` / `css/code-highlight.css`.
 * Catalog: `preview/widgets.html#section-code-highlight`.
 * Tokens come from `highlightOutput` (`code-highlight.ts`) — not Prism,
 * not a TS rewrite of `js/code-highlight.js`. Compose terminal chrome with
 * existing `Panel` `variant="terminal"` + `className="panel__code"`
 * (`.panel__code.ch-code`; theme on the panel, e.g. `ch-theme--vscode`).
 * Not sparkline / QG / WidgetTile.
 */
export function CodeHighlight({
  code,
  kind = 'json',
  plain = false,
  className,
  ...rest
}: CodeHighlightProps) {
  const highlightKind: HighlightKind = plain ? 'plain' : kind;
  const isPlain = plain || kind === 'plain';

  return (
    <pre
      className={cn('ch-code', isPlain && 'ch-code--plain', className)}
      aria-label={DEFAULT_LABEL[kind]}
      {...rest}
      dangerouslySetInnerHTML={{
        __html: highlightOutput(code, highlightKind),
      }}
    />
  );
}
