/** Sibling of `help-info.js` — header configurator panel help. */
export const HELP_INFO_SAMPLE_ITEMS: Array<{ title: string; body: string }>;
export function createHelpInfo(options?: {
  items?: Array<{ title?: string; body?: string }>;
  title?: string;
  ariaLabel?: string;
  testid?: string;
}): { root: HTMLDivElement; dispose: () => void };
export function mountHelpInfo(
  container: ParentNode,
  options?: {
    items?: Array<{ title?: string; body?: string }>;
    title?: string;
    ariaLabel?: string;
    testid?: string;
  },
): () => void;
export function mountHeaderHelpInfo(options?: {
  items?: Array<{ title?: string; body?: string }>;
  title?: string;
  ariaLabel?: string;
  testid?: string;
  toolsSelector?: string;
}): () => void;
