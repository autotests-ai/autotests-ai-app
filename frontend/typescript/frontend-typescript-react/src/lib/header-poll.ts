import { mountHeaderPollToggle } from '../../vendor/ds/js/poll-toggle.js';

export { mountHeaderPollToggle };

/** Wait for header mount, then bind poll toggle. */
export function whenHeaderReady(bind: () => () => void): () => void {
  let dispose: (() => void) | null = null;
  let observer: MutationObserver | null = null;

  const tryBind = () => {
    const tools = document.querySelector('[data-testid="header-tools"]');
    if (!tools) return false;
    dispose?.();
    dispose = bind();
    return true;
  };

  if (!tryBind()) {
    observer = new MutationObserver(() => {
      if (tryBind()) {
        observer?.disconnect();
        observer = null;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    observer?.disconnect();
    dispose?.();
  };
}

/** Live board: inject vendor poll-toggle into header-tools (not a header.js fork). */
export function bindStackHeaderPoll(onTick: () => void): () => void {
  return whenHeaderReady(() =>
    mountHeaderPollToggle({
      defaultOn: true,
      onTick,
    }),
  );
}
