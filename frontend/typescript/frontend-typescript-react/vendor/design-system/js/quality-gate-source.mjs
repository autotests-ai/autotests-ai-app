/**
 * Quality-gate popover paths — browser + allurerc SSOT.
 * stacks/.../constants.mjs re-exports Allure as QUALITY_GATE_SOURCE / LABELS.
 * Do not partial-copy in shell; import objects whole.
 */
export const ALLURE_QUALITY_GATE_SOURCE = {
  configFile: "allurerc.mjs",
  rulesFile: "allure/quality-gate.mjs",
  knownIssuesFile: "./known.json",
  hrefBase:
    "https://github.com/autotests-ai/autotests-ai-multistack-app/blob/master/tests/java/tests-java-junit5-rest_assured-selenide/",
};

export const ALLURE_QUALITY_GATE_LABELS = {
  passed: { ru: "Allure Quality Gate пройден", en: "Allure Quality Gate passed" },
  failed: { ru: "Allure Quality Gate не пройден", en: "Allure Quality Gate failed" },
};

export const SONAR_QUALITY_GATE_SOURCE = {
  configFile: "docs/sonar/quality-gate-profile.json",
  profile: "qa-guru-canon",
  projectKey: "autotests-ai-multistack-app-backend-java-spring",
  hrefBase: "https://github.com/qa-guru/zero-design-system/blob/master/",
};

export const SONAR_QUALITY_GATE_LABELS = {
  passed: { ru: "Sonar Quality Gate пройден", en: "Sonar Quality Gate passed" },
  failed: { ru: "Sonar Quality Gate не пройден", en: "Sonar Quality Gate failed" },
};

/** Fallback when CI has not attached allure/sonar-quality-gate.json. */
export const SONAR_QUALITY_GATE_FIXTURE = {
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

export const SONAR_QUALITY_GATE_PROFILE_CONDITIONS = [
  { metric: "coverage", op: "LT", error: 80, label: "Coverage on Overall Code ≥ 80%" },
  { metric: "bugs", op: "GT", error: 0, label: "Bugs on Overall Code = 0" },
];
