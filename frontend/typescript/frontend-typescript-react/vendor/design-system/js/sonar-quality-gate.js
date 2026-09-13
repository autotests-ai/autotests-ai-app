import { renderQualityGate } from "./quality-gate.js";

/** Sonar adapter — popover UX stays in qg-info.js via renderQualityGate → createQgInfo. */

const DEFAULT_BAR_TITLE = "Sonar Quality Gate";
const DEFAULT_SONAR_HOST = "https://sonar.qa.guru";
const DEFAULT_SONAR_HREF_BASE = "https://github.com/qa-guru/zero-design-system/blob/master/";

const DEFAULT_LABELS = {
  passed: { en: "Sonar Quality Gate passed", ru: "Sonar Quality Gate пройден" },
  failed: { en: "Sonar Quality Gate failed", ru: "Sonar Quality Gate не пройден" },
};

const RATING_LETTERS = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" };

/**
 * @typedef {{
 *   status?: string,
 *   metricKey?: string,
 *   comparator?: string,
 *   errorThreshold?: string | number,
 *   warningThreshold?: string | number,
 *   actualValue?: string | number,
 * }} SonarCondition
 */

/**
 * @param {string | number | undefined | null} value
 * @returns {string | number | undefined}
 */
export function coerceSonarNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const trimmed = String(value).trim();
  if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return value;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    return value;
  }
  return Number.isInteger(num) ? num : Math.round(num * 10) / 10;
}

/**
 * Sonar API returns thresholds/values as strings — normalize for UI/info payload.
 *
 * @param {SonarCondition} condition
 * @returns {SonarCondition}
 */
export function normalizeSonarCondition(condition) {
  /** @type {SonarCondition} */
  const next = { ...condition };
  if (condition.errorThreshold !== undefined) {
    const coerced = coerceSonarNumber(condition.errorThreshold);
    if (coerced !== undefined) {
      next.errorThreshold = coerced;
    }
  }
  if (condition.warningThreshold !== undefined) {
    const coerced = coerceSonarNumber(condition.warningThreshold);
    if (coerced !== undefined) {
      next.warningThreshold = coerced;
    }
  }
  if (condition.actualValue !== undefined) {
    const coerced = coerceSonarNumber(condition.actualValue);
    if (coerced !== undefined) {
      next.actualValue = coerced;
    }
  }
  return next;
}

/**
 * @param {string | number | undefined} value
 * @param {string} metricKey
 * @returns {string | number | undefined}
 */
export function formatSonarMetricValue(value, metricKey) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (/rating/i.test(metricKey)) {
    const num = Number(value);
    if (Number.isFinite(num) && RATING_LETTERS[num]) {
      return RATING_LETTERS[num];
    }
  }
  return coerceSonarNumber(value);
}

/**
 * @param {SonarCondition} condition
 * @returns {import("./quality-gate.js").QualityGateRule}
 */
export function mapSonarConditionToRule(condition) {
  const id = condition.metricKey ?? "condition";
  const comparator = /** @type {import("./quality-gate.js").QualityGateRule["comparator"]} */ (
    condition.comparator ?? "GT"
  );
  const thresholdRaw = condition.errorThreshold ?? condition.warningThreshold;
  const actual = formatSonarMetricValue(condition.actualValue, id);
  const threshold = formatSonarMetricValue(thresholdRaw, id);
  const status = (condition.status ?? "").toUpperCase();
  const passed = status === "OK" || status === "PASSED";

  let message;
  if (passed) {
    message = `${id} ${actual ?? "—"} within threshold ${threshold ?? "—"}`;
  } else if (comparator === "LT" || comparator === "LTE") {
    message = `${id} ${actual ?? "—"} is below the required ${threshold ?? "—"}`;
  } else if (comparator === "GT" || comparator === "GTE") {
    message = `${id} ${actual ?? "—"} exceeds the allowed ${threshold ?? "—"}`;
  } else {
    message = `${id} ${actual ?? "—"} vs ${threshold ?? "—"}`;
  }

  return {
    id,
    message,
    passed,
    actual,
    threshold,
    comparator,
  };
}

/**
 * @param {string | undefined} profile
 * @param {string} [sonarHost]
 * @returns {string | undefined}
 */
export function buildSonarProfileHref(profile, sonarHost = DEFAULT_SONAR_HOST) {
  if (!profile) {
    return undefined;
  }
  return `${sonarHost.replace(/\/$/, "")}/profiles/show?name=${encodeURIComponent(profile)}`;
}

/**
 * @param {string | undefined} projectKey
 * @param {string | undefined} [dashboardUrl]
 * @param {string} [sonarHost]
 * @returns {string | undefined}
 */
export function buildSonarProjectHref(projectKey, dashboardUrl, sonarHost = DEFAULT_SONAR_HOST) {
  if (dashboardUrl) {
    return dashboardUrl;
  }
  if (!projectKey) {
    return undefined;
  }
  return `${sonarHost.replace(/\/$/, "")}/dashboard?id=${encodeURIComponent(projectKey)}`;
}

/**
 * @typedef {{
 *   configFile?: string,
 *   profile?: string,
 *   projectKey?: string,
 *   hrefBase?: string,
 *   profileHref?: string,
 *   projectHref?: string,
 *   sonarHost?: string,
 * }} SonarQgInfoSource
 */

/**
 * @param {SonarQgInfoSource | undefined} source
 * @param {{
 *   project_key?: string,
 *   projectKey?: string,
 *   dashboard_url?: string,
 * }} [projectStatus]
 * @param {string | undefined} profile
 * @param {string | undefined} projectKey
 * @returns {SonarQgInfoSource}
 */
function resolveSonarQgInfoSource(source = {}, projectStatus = {}, profile, projectKey) {
  const sonarHost = source.sonarHost ?? DEFAULT_SONAR_HOST;
  const key = projectKey ?? projectStatus.project_key ?? projectStatus.projectKey ?? source.projectKey;
  const profileName = profile ?? source.profile;

  return {
    configFile: source.configFile ?? "docs/sonar/quality-gate-profile.json",
    profile: profileName,
    projectKey: key,
    hrefBase: source.hrefBase ?? DEFAULT_SONAR_HREF_BASE,
    profileHref: source.profileHref ?? buildSonarProfileHref(profileName, sonarHost),
    projectHref: source.projectHref ?? buildSonarProjectHref(key, projectStatus.dashboard_url, sonarHost),
  };
}

/**
 * @param {{
 *   status?: string,
 *   ok?: boolean,
 *   passed?: boolean,
 *   project_key?: string,
 *   projectKey?: string,
 *   analysis_id?: string,
 *   conditions?: SonarCondition[],
 *   dashboard_url?: string,
 * }} projectStatus
 * @param {{
 *   profile?: string,
 *   profileConditions?: Array<Record<string, unknown>>,
 *   source?: {
 *     configFile?: string,
 *     profile?: string,
 *     projectKey?: string,
 *   },
 * }} [meta]
 */
export function buildSonarQualityGateInfoPayload(projectStatus, meta = {}) {
  const conditions = (projectStatus.conditions ?? []).map(normalizeSonarCondition);
  const projectKey = projectStatus.project_key ?? projectStatus.projectKey ?? meta.source?.projectKey;
  const status = projectStatus.status ?? (projectStatus.ok || projectStatus.passed ? "OK" : "ERROR");
  const passed =
    projectStatus.passed ??
    projectStatus.ok ??
    ["OK", "PASSED"].includes(String(status).toUpperCase());

  const profileConditions = (meta.profileConditions ?? []).map((condition) => {
    if (!condition || typeof condition !== "object") {
      return condition;
    }
    const next = { ...condition };
    if ("error" in next) {
      const coerced = coerceSonarNumber(/** @type {string | number | undefined} */ (next.error));
      if (coerced !== undefined) {
        next.error = coerced;
      }
    }
    return next;
  });

  return {
    qualityGate: {
      profile: meta.profile ?? meta.source?.profile,
      projectKey,
      conditions: profileConditions,
    },
    result: {
      status,
      passed: Boolean(passed),
      analysisId: projectStatus.analysis_id,
      dashboardUrl: projectStatus.dashboard_url,
      conditions,
    },
  };
}

/**
 * Map Sonar `project_status` / `sonar-gate-wait` JSON → `renderQualityGate` options.
 *
 * @param {{
 *   status?: string,
 *   ok?: boolean,
 *   passed?: boolean,
 *   project_key?: string,
 *   projectKey?: string,
 *   analysis_id?: string,
 *   conditions?: SonarCondition[],
 *   dashboard_url?: string,
 * }} projectStatus
 * @param {{
 *   profile?: string,
 *   profileConditions?: Array<Record<string, unknown>>,
 *   source?: SonarQgInfoSource,
 *   lang?: "ru" | "en",
 *   barTitle?: string,
 *   passed?: boolean,
 *   labels?: { passed?: import("./quality-gate.js").QualityGateLabel, failed?: import("./quality-gate.js").QualityGateLabel },
 * }} [options]
 */
export function sonarProjectStatusToQualityGateOptions(projectStatus, options = {}) {
  const conditions = projectStatus.conditions ?? [];
  const rules = conditions.map(mapSonarConditionToRule);
  const status = projectStatus.status ?? (projectStatus.ok || projectStatus.passed ? "OK" : "ERROR");
  const passed =
    options.passed ??
    projectStatus.passed ??
    projectStatus.ok ??
    ["OK", "PASSED"].includes(String(status).toUpperCase());
  const projectKey = projectStatus.project_key ?? projectStatus.projectKey ?? options.source?.projectKey;
  const profile = options.profile ?? options.source?.profile;

  // Passed tile needs at least one rule row so the host is not hidden.
  const displayRules =
    rules.length > 0
      ? rules
      : [
          {
            id: "status",
            message: passed ? "Quality gate OK" : `Quality gate ${status}`,
            passed: Boolean(passed),
            actual: status,
            threshold: "OK",
            comparator: /** @type {const} */ ("EQ"),
          },
        ];

  return {
    kind: /** @type {const} */ ("sonar"),
    testId: "sonar-quality-gate",
    passed: Boolean(passed),
    barTitle: options.barTitle ?? DEFAULT_BAR_TITLE,
    lang: options.lang ?? "ru",
    labels: options.labels ?? DEFAULT_LABELS,
    rules: displayRules,
    config: {
      profile,
      projectKey,
      conditions: options.profileConditions ?? [],
      source: resolveSonarQgInfoSource(options.source, projectStatus, profile, projectKey),
    },
    infoPayload: buildSonarQualityGateInfoPayload(projectStatus, options),
  };
}

/** Demo / catalog samples — numeric thresholds (Sonar API strings are coerced in payload). */
export const SONAR_QG_SAMPLE_FAILED = {
  status: "ERROR",
  project_key: "autotests-ai-multistack-app-backend-java-spring",
  analysis_id: "AXdemoFailedAnalysis",
  dashboard_url: "https://sonar.qa.guru/dashboard?id=autotests-ai-multistack-app-backend-java-spring",
  conditions: [
    {
      status: "ERROR",
      metricKey: "coverage",
      comparator: "LT",
      errorThreshold: 80,
      actualValue: 72.4,
    },
    {
      status: "ERROR",
      metricKey: "bugs",
      comparator: "GT",
      errorThreshold: 0,
      actualValue: 2,
    },
    {
      status: "OK",
      metricKey: "new_security_rating",
      comparator: "GT",
      errorThreshold: 1,
      actualValue: 1,
    },
  ],
};

export const SONAR_QG_SAMPLE_PASSED = {
  status: "OK",
  project_key: "autotests-ai-multistack-app-backend-java-spring",
  analysis_id: "AXdemoPassedAnalysis",
  dashboard_url: "https://sonar.qa.guru/dashboard?id=autotests-ai-multistack-app-backend-java-spring",
  conditions: [
    {
      status: "OK",
      metricKey: "coverage",
      comparator: "LT",
      errorThreshold: 80,
      actualValue: 100,
    },
    {
      status: "OK",
      metricKey: "bugs",
      comparator: "GT",
      errorThreshold: 0,
      actualValue: 0,
    },
  ],
};

/** Long metric keys — wrap inside the shared 6.5rem id column. */
export const SONAR_QG_SAMPLE_FAILED_LONG = {
  status: "ERROR",
  project_key: "autotests-ai-multistack-app-backend-java-spring",
  analysis_id: "AXdemoFailedLongAnalysis",
  dashboard_url: "https://sonar.qa.guru/dashboard?id=autotests-ai-multistack-app-backend-java-spring",
  conditions: [
    {
      status: "ERROR",
      metricKey: "new_duplicated_lines_density",
      comparator: "GT",
      errorThreshold: 3,
      actualValue: 4.8,
    },
    {
      status: "ERROR",
      metricKey: "new_security_hotspots_reviewed",
      comparator: "LT",
      errorThreshold: 100,
      actualValue: 62.5,
    },
    {
      status: "ERROR",
      metricKey: "new_maintainability_rating",
      comparator: "GT",
      errorThreshold: 1,
      actualValue: 3,
    },
  ],
};

export const SONAR_QG_SAMPLE_PROFILE_CONDITIONS = [
  { metric: "coverage", op: "LT", error: 80, label: "Coverage on Overall Code ≥ 80%" },
  { metric: "bugs", op: "GT", error: 0, label: "Bugs on Overall Code = 0" },
  {
    metric: "new_security_rating",
    op: "GT",
    error: 1,
    label: "Security Rating on New Code = A",
  },
];

/**
 * @param {HTMLElement} host
 * @param {{
 *   projectStatus?: Parameters<typeof sonarProjectStatusToQualityGateOptions>[0],
 *   profile?: string,
 *   profileConditions?: Array<Record<string, unknown>>,
 *   source?: { configFile?: string, profile?: string, projectKey?: string },
 *   lang?: "ru" | "en",
 *   barTitle?: string,
 *   passed?: boolean,
 *   rules?: import("./quality-gate.js").QualityGateRule[],
 *   labels?: { passed?: import("./quality-gate.js").QualityGateLabel, failed?: import("./quality-gate.js").QualityGateLabel },
 * }} [options]
 */
export function renderSonarQualityGate(host, options = {}) {
  if (options.projectStatus) {
    return renderQualityGate(
      host,
      sonarProjectStatusToQualityGateOptions(options.projectStatus, options),
    );
  }

  return renderQualityGate(host, {
    kind: "sonar",
    testId: "sonar-quality-gate",
    barTitle: options.barTitle ?? DEFAULT_BAR_TITLE,
    lang: options.lang ?? "ru",
    labels: options.labels ?? DEFAULT_LABELS,
    passed: options.passed,
    rules: options.rules ?? [],
    config: {
      profile: options.profile ?? options.source?.profile,
      projectKey: options.source?.projectKey,
      conditions: options.profileConditions ?? [],
      source: resolveSonarQgInfoSource(
        options.source,
        { project_key: options.source?.projectKey },
        options.profile ?? options.source?.profile,
        options.source?.projectKey,
      ),
    },
    infoPayload: buildSonarQualityGateInfoPayload(
      {
        status: options.passed ? "OK" : "ERROR",
        passed: options.passed,
        project_key: options.source?.projectKey,
        conditions: [],
      },
      options,
    ),
  });
}
