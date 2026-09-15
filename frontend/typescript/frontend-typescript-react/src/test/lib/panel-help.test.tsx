import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { en, ru } from '../../i18n';
import {
  flattenPanelHelpItems,
  PANEL_HELP_IDS,
  PanelHelp,
  panelHelpItems,
} from '../../lib/panel-help';

const FORBIDDEN = /mill\.yml|\bADR\b|Box2|\bPAT\b|overlay|009/i;

describe('panel-help', () => {
  afterEach(() => {
    for (const node of document.body.querySelectorAll('.help-info__popover')) {
      node.remove();
    }
  });

  it('groups Agents+protect and Destination+clone-course, no mill.yml or ADR', () => {
    const enCatalog = panelHelpItems(en);
    expect(PANEL_HELP_IDS).toHaveLength(11);
    expect(enCatalog.agents.map((item) => item.title)).toEqual([
      en.home.panelAgents,
      en.home.millProtect,
    ]);
    expect(enCatalog.destination.map((item) => item.title)).toEqual([
      en.home.panelDestination,
      en.home.cloneCourse,
    ]);
    expect(enCatalog.output[0]?.title).toBe(en.home.outputFormat);
    const blob = flattenPanelHelpItems(en)
      .map((item) => `${item.title} ${item.body}`)
      .join('\n');
    expect(blob).not.toMatch(FORBIDDEN);
    expect(flattenPanelHelpItems(ru).map((item) => item.title)).toEqual([
      ru.home.panelProject,
      ru.home.panelAgents,
      ru.home.millProtect,
      ru.home.panelImport,
      ru.home.panelDestination,
      ru.home.cloneCourse,
      ru.home.panelBuild,
      ru.home.panelAllure,
      ru.home.panelDriver,
      ru.home.panelRemote,
      ru.home.panelConsole,
      ru.home.panelTestops,
      ru.home.outputFormat,
    ]);
    expect(
      flattenPanelHelpItems(ru)
        .map((item) => item.body)
        .join('\n'),
    ).not.toMatch(FORBIDDEN);
  });

  it('mounts a panel-bar trigger with the panel title as aria-label', () => {
    const { container, rerender } = render(
      <PanelHelp
        items={panelHelpItems(en).project}
        ariaLabel={en.home.panelProject}
        testId="landing-project-help"
      />,
    );
    const trigger = container.querySelector('[data-testid="landing-project-help-btn"]');
    expect(trigger).toHaveAttribute('aria-label', en.home.panelProject);
    expect(document.querySelector('.help-info__title')?.textContent).toBe(en.home.panelProject);
    rerender(
      <PanelHelp
        items={panelHelpItems(ru).project}
        ariaLabel={ru.home.panelProject}
        testId="landing-project-help"
      />,
    );
    expect(container.querySelector('[data-testid="landing-project-help-btn"]')).toHaveAttribute(
      'aria-label',
      ru.home.panelProject,
    );
  });

  it('shows that panel body on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PanelHelp
        items={panelHelpItems(en).project}
        ariaLabel={en.home.panelProject}
        testId="landing-project-help"
      />,
    );
    const trigger = container.querySelector('[data-testid="landing-project-help-btn"]');
    expect(trigger).toBeTruthy();
    await user.hover(trigger as HTMLElement);
    const popover = document.querySelector('.help-info__popover--open');
    expect(popover?.querySelector('.help-info__body')?.textContent).toBe(en.home.helpProject);
  });
});
