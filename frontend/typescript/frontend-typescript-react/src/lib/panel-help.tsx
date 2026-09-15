import { useLayoutEffect, useRef } from 'react';
import { mountHelpInfo } from '../../vendor/ds/js/help-info.js';
import type { Dictionary } from '../i18n';

export type HelpInfoItem = { title: string; body: string };

export type PanelHelpId =
  | 'project'
  | 'agents'
  | 'import'
  | 'destination'
  | 'build'
  | 'allure'
  | 'driver'
  | 'remote'
  | 'console'
  | 'testops'
  | 'output';

export const PANEL_HELP_IDS: PanelHelpId[] = [
  'project',
  'agents',
  'import',
  'destination',
  'build',
  'allure',
  'driver',
  'remote',
  'console',
  'testops',
  'output',
];

/** Per-panel popover rows. Agents includes protect; Destination includes clone-course. */
export function panelHelpItems(copy: Dictionary): Record<PanelHelpId, HelpInfoItem[]> {
  const home = copy.home;
  return {
    project: [{ title: home.panelProject, body: home.helpProject }],
    agents: [
      { title: home.panelAgents, body: home.helpAgents },
      { title: home.millProtect, body: home.helpProtect },
    ],
    import: [{ title: home.panelImport, body: home.helpImport }],
    destination: [
      { title: home.panelDestination, body: home.helpDestination },
      { title: home.cloneCourse, body: home.helpCloneCourse },
    ],
    build: [{ title: home.panelBuild, body: home.helpBuild }],
    allure: [{ title: home.panelAllure, body: home.helpAllure }],
    driver: [{ title: home.panelDriver, body: home.helpDriver }],
    remote: [{ title: home.panelRemote, body: home.helpRemote }],
    console: [{ title: home.panelConsole, body: home.helpConsole }],
    testops: [{ title: home.panelTestops, body: home.helpTestops }],
    output: [{ title: home.outputFormat, body: home.helpOutput }],
  };
}

export function flattenPanelHelpItems(copy: Dictionary): HelpInfoItem[] {
  const catalog = panelHelpItems(copy);
  return PANEL_HELP_IDS.flatMap((id) => catalog[id]);
}

export function PanelHelp({
  items,
  ariaLabel,
  testId,
}: {
  items: HelpInfoItem[];
  ariaLabel: string;
  testId: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const itemsKey = JSON.stringify(items);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    return mountHelpInfo(host, {
      items: JSON.parse(itemsKey) as HelpInfoItem[],
      ariaLabel,
      testid: testId,
    });
  }, [ariaLabel, itemsKey, testId]);

  return <div ref={hostRef} />;
}
