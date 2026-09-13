import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';
import { cn } from './cn';
import { Indicator } from './Indicator';
import { QgInfo } from './QgInfo';
import {
  buildQualityGateInfoPayload,
  formatQualityGateRuleFormula,
  resolveQualityGateFileSource,
  resolveQualityGateLabel,
  type QualityGateConfig,
  type QualityGateKind,
  type QualityGateLabel,
  type QualityGateLang,
  type QualityGateRule,
} from './quality-gate-canon.js';

export type {
  QualityGateConfig,
  QualityGateFileSource,
  QualityGateKind,
  QualityGateLabel,
  QualityGateLang,
  QualityGateRule,
} from './quality-gate-canon.js';

export interface QualityGateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  rules: readonly QualityGateRule[];
  /** Gate verdict. Default `false` (`Boolean(passed)` in `renderQualityGate`). */
  passed?: boolean;
  /** Copy for aria-label + passed verdict. Default `ru`. */
  lang?: QualityGateLang;
  /** Bar heading. Default `Quality gate`. Catalog uses `Allure Quality Gate`. */
  barTitle?: string;
  /** Popover payload + path source (`QgInfo` → `createQgInfo`). */
  config?: QualityGateConfig;
  labels?: { passed?: QualityGateLabel; failed?: QualityGateLabel };
  /** Tile modifier. Default `allure` (not `sonar`). */
  kind?: QualityGateKind;
  /** Popover JSON. Default Allure `buildQualityGateInfoPayload`. */
  infoPayload?: Record<string, unknown>;
  'data-testid'?: string;
}

function QualityGateFailedRules({ rules }: { rules: readonly QualityGateRule[] }) {
  const failedRules = rules.filter((rule) => !rule.passed);
  if (!failedRules.length) {
    return null;
  }

  return (
    <ul className="quality-gate__rules">
      {failedRules.map((rule) => {
        const formula = formatQualityGateRuleFormula(rule);
        return (
          <li key={rule.id} className="quality-gate__rule">
            <div className="quality-gate__rule-id">{rule.id}</div>
            <div className="quality-gate__rule-detail">
              <p className="quality-gate__message">{rule.message}</p>
              {formula ? (
                <p className="quality-gate__formula">{formula}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Allure quality gate (`div.quality-gate` + `__bar` + `__body`).
 * Thin wrapper — markup SSOT: `design-system/templates/quality-gate.html` /
 * `css/quality-gate.css`. Embed SSOT: `renderQualityGate` /
 * `resolveQualityGateLabel` / `formatQualityGateRuleFormula` /
 * `buildQualityGateInfoPayload` in `js/quality-gate.js`. Bar info composes
 * `QgInfo` (`content` + `fileSource`); pin / hover stay in `createQgInfo`
 * via that wrapper. Catalog: `preview/widgets.html#section-quality-gate`
 * (`quality-gate-demo-failed` / `-passed`; not `quality-gate-variants`).
 * Hybrid tile only (`__bar`, not callout-without-bar). Default `lang` `ru`,
 * `kind` `allure`, barTitle `Quality gate`. Empty `rules` → hidden empty
 * host. Sonar adapter is `SonarQualityGate` (compose `kind="sonar"` +
 * `infoPayload`, not a second chrome). Not tests-table / Sparkline /
 * StabilityCell / WidgetTile / mosaic / ChartTile / CodeHighlight.
 */
export function QualityGate({
  rules,
  passed = false,
  lang = 'ru',
  barTitle = 'Quality gate',
  config,
  labels,
  kind = 'allure',
  infoPayload: infoPayloadProp,
  className,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  ...rest
}: QualityGateProps) {
  const testId =
    dataTestId ?? (kind === 'sonar' ? 'sonar-quality-gate' : 'quality-gate');
  const infoPayload = useMemo(
    () =>
      infoPayloadProp ??
      buildQualityGateInfoPayload({
        passed,
        rules: [...rules],
        config,
      }),
    [infoPayloadProp, passed, rules, config],
  );
  const fileSource = useMemo(
    () => resolveQualityGateFileSource(config),
    [config],
  );

  if (!rules.length) {
    return (
      <div
        className={cn('quality-gate', className)}
        {...rest}
        hidden
        data-testid={testId}
      />
    );
  }

  const statusLabel = passed
    ? resolveQualityGateLabel(labels?.passed, 'passed', lang)
    : resolveQualityGateLabel(labels?.failed, 'failed', lang);
  const tone = passed ? 'passed' : 'failed';

  return (
    <div
      className={cn(
        'quality-gate',
        `quality-gate--${kind}`,
        `quality-gate--${tone}`,
        className,
      )}
      {...rest}
      role="status"
      data-testid={testId}
      aria-label={ariaLabel ?? statusLabel}
    >
      <div className="quality-gate__bar">
        <Indicator tone={tone} solid aria-hidden="true" />
        <span className="quality-gate__bar-title">{barTitle}</span>
        <QgInfo content={infoPayload} fileSource={fileSource} />
      </div>
      <div className="quality-gate__body">
        {passed ? (
          <p className="quality-gate__verdict quality-gate__verdict--ok">
            {lang === 'en' ? 'Passed' : 'Пройден'}
          </p>
        ) : (
          <QualityGateFailedRules rules={rules} />
        )}
      </div>
    </div>
  );
}
