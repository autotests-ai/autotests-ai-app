export type HelpInfoItem = {
  title: string;
  body: string;
};

export const HELP_INFO_SAMPLE_ITEMS: HelpInfoItem[];

export function createHelpInfo(options?: {
  items?: HelpInfoItem[];
  title?: string;
  ariaLabel?: string;
  testid?: string;
}): { root: HTMLDivElement; dispose: () => void };

export function mountHelpInfo(
  container: ParentNode,
  options?: {
    items?: HelpInfoItem[];
    title?: string;
    ariaLabel?: string;
    testid?: string;
  },
): () => void;
