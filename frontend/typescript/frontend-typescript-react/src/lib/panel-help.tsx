import { useLayoutEffect, useRef } from 'react';
import { mountHelpInfo } from '../../vendor/ds/js/help-info.js';
import { type Dictionary, formatCopy } from '../i18n';
import { AGENT_CATALOG, DESTINATIONS } from './landing-config';

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

export type StackHelpId = 'backend' | 'frontend' | 'tests' | 'performance';

export const STACK_HELP_IDS: StackHelpId[] = ['backend', 'frontend', 'tests', 'performance'];

/** Per-panel popover rows. Dest/import/agents follow the form chips; protect and clone stay. */
export function panelHelpItems(copy: Dictionary): Record<PanelHelpId, HelpInfoItem[]> {
  const home = copy.home;
  return {
    project: [{ title: home.panelProject, body: home.helpProject }],
    agents: [
      ...AGENT_CATALOG.map((agent) => ({
        title: agent.value,
        body: formatCopy(home.helpAgent, { module: agent.module }),
      })),
      { title: home.millProtect, body: home.helpProtect },
    ],
    import: [
      { title: home.importUrl, body: home.helpImportUrl },
      { title: home.importZip, body: home.helpImportZip },
    ],
    destination: [
      ...DESTINATIONS.map((option) => ({
        title: option.value,
        body: home.helpDest[option.value],
      })),
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

/** /stack/ board popovers. Load/Grafana stay as bar icons; listed here so hover names them. */
export function stackHelpItems(copy: Dictionary): Record<StackHelpId, HelpInfoItem[]> {
  const stack = copy.stack;
  return {
    backend: [{ title: stack.panelBackend, body: stack.helpBackend }],
    frontend: [{ title: stack.panelFrontend, body: stack.helpFrontend }],
    tests: [{ title: stack.panelTests, body: stack.helpTests }],
    performance: [
      { title: stack.panelPerformance, body: stack.helpPerformance },
      { title: stack.loadBoard, body: stack.helpLoadBoard },
      { title: stack.grafana, body: stack.helpGrafana },
    ],
  };
}

export function flattenStackHelpItems(copy: Dictionary): HelpInfoItem[] {
  const catalog = stackHelpItems(copy);
  return STACK_HELP_IDS.flatMap((id) => catalog[id]);
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
