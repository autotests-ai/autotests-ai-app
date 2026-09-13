import type {
  QualityGateLabel,
  QualityGateLang,
  QualityGateRenderOptions,
  QualityGateRule,
} from './quality-gate-canon.js';

export type SonarCondition = {
  status?: string;
  metricKey?: string;
  comparator?: QualityGateRule['comparator'];
  errorThreshold?: string | number;
  warningThreshold?: string | number;
  actualValue?: string | number;
};

export type SonarProjectStatus = {
  status?: string;
  ok?: boolean;
  passed?: boolean;
  project_key?: string;
  projectKey?: string;
  analysis_id?: string;
  conditions?: readonly SonarCondition[];
  dashboard_url?: string;
};

export type SonarQgInfoSource = {
  configFile?: string;
  profile?: string;
  projectKey?: string;
  hrefBase?: string;
  profileHref?: string;
  projectHref?: string;
  sonarHost?: string;
};

export type SonarQualityGateMapOptions = {
  profile?: string;
  profileConditions?: Array<Record<string, unknown>>;
  source?: SonarQgInfoSource;
  lang?: QualityGateLang;
  barTitle?: string;
  passed?: boolean;
  labels?: { passed?: QualityGateLabel; failed?: QualityGateLabel };
};

export function mapSonarConditionToRule(condition: SonarCondition): QualityGateRule;

export function buildSonarQualityGateInfoPayload(
  projectStatus: SonarProjectStatus,
  meta?: {
    profile?: string;
    profileConditions?: Array<Record<string, unknown>>;
    source?: SonarQgInfoSource;
  },
): Record<string, unknown>;

export function sonarProjectStatusToQualityGateOptions(
  projectStatus: SonarProjectStatus,
  options?: SonarQualityGateMapOptions,
): QualityGateRenderOptions;

export function renderSonarQualityGate(
  host: HTMLElement,
  options?: SonarQualityGateMapOptions & {
    projectStatus?: SonarProjectStatus;
    rules?: readonly QualityGateRule[];
  },
): { hidden: boolean; passed?: boolean };

export const SONAR_QG_SAMPLE_FAILED: SonarProjectStatus;
export const SONAR_QG_SAMPLE_PASSED: SonarProjectStatus;
export const SONAR_QG_SAMPLE_FAILED_LONG: SonarProjectStatus;
export const SONAR_QG_SAMPLE_PROFILE_CONDITIONS: Array<Record<string, unknown>>;
