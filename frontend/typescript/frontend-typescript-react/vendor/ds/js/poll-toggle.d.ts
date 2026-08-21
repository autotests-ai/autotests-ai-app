/** Sibling of `poll-toggle.js` — header auto-refresh control. */
export const POLL_DEFAULT_MS: number;
export function formatPollLabel(ms: number): string;
export function pollToggleMarkup(options?: {
  intervalMs?: number;
  on?: boolean;
  testid?: string;
}): string;
export function mountPollToggle(
  container: ParentNode,
  options?: {
    intervalMs?: number;
    defaultOn?: boolean;
    onTick?: () => void;
    testid?: string;
  },
): () => void;
export function mountHeaderPollToggle(options?: {
  intervalMs?: number;
  defaultOn?: boolean;
  onTick?: () => void;
  testid?: string;
  toolsSelector?: string;
}): () => void;
