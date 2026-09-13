export type QualityGateLang = 'ru' | 'en';

export type QualityGateKind = 'allure' | 'sonar';

export type QualityGateLabel = string | Partial<Record<QualityGateLang, string>>;

export type QualityGateComparator = 'LT' | 'GT' | 'EQ' | 'NE' | 'LTE' | 'GTE';

export type QualityGateRule = {
  id: string;
  message: string;
  passed?: boolean;
  actual?: number | string;
  expected?: number | string;
  threshold?: number | string;
  comparator?: QualityGateComparator;
};

export type QualityGateFileSource = {
  configFile?: string;
  rulesFile?: string;
  knownIssuesFile?: string;
  profile?: string;
  projectKey?: string;
  hrefBase?: string;
  profileHref?: string;
  projectHref?: string;
};

export type QualityGateConfig = {
  rules?: readonly Record<string, unknown>[];
  knownIssuesPath?: string;
  source?: QualityGateFileSource;
  profile?: string;
  projectKey?: string;
  conditions?: readonly Record<string, unknown>[];
};

export type QualityGateRenderOptions = {
  passed?: boolean;
  title?: string;
  barTitle?: string;
  kind?: QualityGateKind;
  testId?: string;
  rules?: readonly QualityGateRule[];
  config?: QualityGateConfig;
  infoPayload?: Record<string, unknown>;
  labels?: { passed?: QualityGateLabel; failed?: QualityGateLabel };
  lang?: QualityGateLang;
};

export function resolveQualityGateLabel(
  entry: QualityGateLabel | undefined,
  key: 'passed' | 'failed',
  lang?: QualityGateLang,
): string;

export function formatQualityGateRuleFormula(rule: QualityGateRule): string;

export function resolveQualityGateFileSource(
  config?: QualityGateConfig,
): QualityGateFileSource | undefined;

export function buildQualityGateInfoPayload(options: {
  passed?: boolean;
  rules?: readonly QualityGateRule[];
  config?: QualityGateConfig;
}): Record<string, unknown>;

export function renderQualityGate(
  host: HTMLElement,
  options?: QualityGateRenderOptions,
): { hidden: boolean; passed?: boolean };

export function createQgInfo(
  content: string | Record<string, unknown>,
  fileSource?: QualityGateFileSource,
): HTMLDivElement;
