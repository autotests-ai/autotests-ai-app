import { mountHeaderHelpInfo } from '../../vendor/ds/js/help-info.js';
import type { Dictionary } from '../i18n';
import { whenHeaderReady } from './header-poll';

export { mountHeaderHelpInfo };

export const HEADER_HELP_TESTID = 'header-help';

export type HelpInfoItem = { title: string; body: string };

/** Project … Output — titles from panel chrome, bodies from help* copy. */
export function helpInfoItems(copy: Dictionary): HelpInfoItem[] {
  const home = copy.home;
  return [
    { title: home.panelProject, body: home.helpProject },
    { title: home.panelAgents, body: home.helpAgents },
    { title: home.millProtect, body: home.helpProtect },
    { title: home.panelImport, body: home.helpImport },
    { title: home.panelDestination, body: home.helpDestination },
    { title: home.cloneCourse, body: home.helpCloneCourse },
    { title: home.panelBuild, body: home.helpBuild },
    { title: home.panelAllure, body: home.helpAllure },
    { title: home.panelDriver, body: home.helpDriver },
    { title: home.panelRemote, body: home.helpRemote },
    { title: home.panelConsole, body: home.helpConsole },
    { title: home.panelTestops, body: home.helpTestops },
    { title: home.outputFormat, body: home.helpOutput },
  ];
}

function headerHelpOptions(copy: Dictionary) {
  return {
    testid: HEADER_HELP_TESTID,
    title: copy.home.helpTitle,
    ariaLabel: copy.home.helpAria,
    items: helpInfoItems(copy),
  };
}

/**
 * Inject vendor help-info into header-tools (not a header.js fork).
 * Re-attaches after header remount (lang change).
 */
export function bindHeaderHelp(copy: Dictionary): () => void {
  const options = headerHelpOptions(copy);
  let disposeMount: (() => void) | null = null;

  const attach = () => {
    const tools = document.querySelector('[data-testid="header-tools"]');
    if (!tools) {
      return false;
    }
    if (tools.querySelector(`[data-testid="${HEADER_HELP_TESTID}"]`)) {
      return true;
    }
    disposeMount?.();
    disposeMount = mountHeaderHelpInfo(options);
    return true;
  };

  const readyDispose = whenHeaderReady(() => {
    attach();
    return () => {};
  });

  const observer = new MutationObserver(() => {
    attach();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    readyDispose();
    disposeMount?.();
  };
}
