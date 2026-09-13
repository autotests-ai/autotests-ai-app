import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';
import { QualityGate } from './QualityGate';
import type {
  QualityGateLabel,
  QualityGateLang,
  QualityGateRule,
} from './quality-gate-canon.js';
import {
  buildSonarQualityGateInfoPayload,
  mapSonarConditionToRule,
  sonarProjectStatusToQualityGateOptions,
  type SonarProjectStatus,
  type SonarQgInfoSource,
} from './sonar-quality-gate-canon.js';

export {
  buildSonarQualityGateInfoPayload,
  mapSonarConditionToRule,
  sonarProjectStatusToQualityGateOptions,
};

export type {
  SonarCondition,
  SonarProjectStatus,
  SonarQgInfoSource,
} from './sonar-quality-gate-canon.js';

export interface SonarQualityGateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Sonar `project_status` / `sonar-gate-wait` JSON. Empty `conditions` → hidden. */
  projectStatus?: SonarProjectStatus;
  profile?: string;
  profileConditions?: readonly Record<string, unknown>[];
  source?: SonarQgInfoSource;
  /** Copy for aria-label + passed verdict. Default `ru`. */
  lang?: QualityGateLang;
  /** Bar heading. Default `Sonar Quality Gate`. */
  barTitle?: string;
  passed?: boolean;
  /** Used when `projectStatus` is omitted. Empty → hidden. */
  rules?: readonly QualityGateRule[];
  labels?: { passed?: QualityGateLabel; failed?: QualityGateLabel };
  'data-testid'?: string;
}

/**
 * Sonar quality gate — compose `QualityGate` `kind="sonar"` (same hybrid
 * tile, not a second chrome). Markup SSOT:
 * `design-system/templates/sonar-quality-gate.html` / `css/quality-gate.css` +
 * `css/qg-info.css` (not `sonar-*.css`). Embed SSOT:
 * `sonarProjectStatusToQualityGateOptions` / `mapSonarConditionToRule` /
 * `buildSonarQualityGateInfoPayload` in `js/sonar-quality-gate.js`. Catalog:
 * `preview/widgets.html#section-quality-gate` (`sonar-quality-gate-demo-failed`
 * / `-passed` / `-long`). Template `data-testid="sonar-quality-gate"`. Default
 * `lang` `ru`, `barTitle` `Sonar Quality Gate`. Empty `conditions` → hidden.
 * Popover is `QualityGate` → `QgInfo` (not a second chrome / `QgInfo` export).
 * Not Allure `QualityGate` demo, not tests-table / Sparkline / StabilityCell /
 * ChartTile / CodeHighlight.
 */
export function SonarQualityGate({
  projectStatus,
  profile,
  profileConditions,
  source,
  lang = 'ru',
  barTitle = 'Sonar Quality Gate',
  passed,
  rules,
  labels,
  className,
  'data-testid': dataTestId,
  ...rest
}: SonarQualityGateProps) {
  const mapped = useMemo(() => {
    const meta = {
      profile,
      profileConditions: profileConditions
        ? [...profileConditions]
        : undefined,
      source,
      lang,
      barTitle,
      passed,
      labels,
    };
    const options = sonarProjectStatusToQualityGateOptions(
      projectStatus ?? {
        status: passed ? 'OK' : 'ERROR',
        passed,
        project_key: source?.projectKey,
        conditions: [],
      },
      meta,
    );
    return {
      passed: options.passed,
      lang: options.lang,
      barTitle: options.barTitle,
      config: options.config,
      labels: options.labels,
      infoPayload: projectStatus
        ? buildSonarQualityGateInfoPayload(projectStatus, meta)
        : options.infoPayload,
      rules: projectStatus
        ? (projectStatus.conditions ?? []).map(mapSonarConditionToRule)
        : (rules ?? []),
    };
  }, [
    projectStatus,
    profile,
    profileConditions,
    source,
    lang,
    barTitle,
    passed,
    labels,
    rules,
  ]);

  return (
    <QualityGate
      {...rest}
      className={className}
      kind="sonar"
      rules={mapped.rules}
      passed={mapped.passed}
      lang={mapped.lang}
      barTitle={mapped.barTitle}
      config={mapped.config}
      labels={mapped.labels}
      infoPayload={mapped.infoPayload}
      data-testid={dataTestId}
    />
  );
}
