import {
  PYRAMID_LAYERS,
  STABILITY_SKIP_STATUSES,
  STABILITY_THRESHOLD,
  TITLES,
} from "./constants.mjs";

/**
 * Dashboard plugin layout.
 * Locked 2×2 (indices 0–3):
 *   [0] currentStatus     [1] durationDynamics
 *   [2] testingPyramid    [3] durations (groupBy: layer)
 */
export function buildDashboardLayout({ epicCharts = [] } = {}) {
  const epicStatusDynamics = epicCharts.map((epic) => ({
    type: "statusDynamics",
    title: `Динамика — ${epic}`,
    limit: 20,
    filter: ({ labels }) =>
      labels.some(({ name, value }) => name === "epic" && value === epic),
  }));

  return [
    {
      type: "currentStatus",
      title: TITLES.currentStatus,
    },
    {
      type: "durationDynamics",
      title: TITLES.durationDynamics,
      limit: 20,
    },
    {
      type: "testingPyramid",
      title: TITLES.testingPyramid,
      layers: [...PYRAMID_LAYERS],
    },
    {
      type: "durations",
      title: TITLES.durationsByLayer,
      groupBy: "layer",
    },
    {
      type: "statusDynamics",
      title: TITLES.statusDynamics,
      limit: 20,
    },
    {
      type: "successRateDistribution",
      title: TITLES.successRateDistribution,
    },
    {
      type: "stabilityDistribution",
      title: TITLES.stabilityByComponent,
      threshold: STABILITY_THRESHOLD,
      skipStatuses: [...STABILITY_SKIP_STATUSES],
      groupBy: "label-name:component",
    },
    {
      type: "statusTransitions",
      title: TITLES.statusTransitions,
      limit: 20,
    },
    {
      type: "testBaseGrowthDynamics",
      title: TITLES.testBaseGrowthDynamics,
      limit: 20,
    },
    {
      type: "coverageDiff",
      title: TITLES.coverageDiff,
    },
    {
      type: "problemsDistribution",
      title: TITLES.problemsByEnvironment,
      by: "environment",
    },
    {
      type: "stabilityDistribution",
      title: TITLES.stabilityByFeature,
      threshold: STABILITY_THRESHOLD,
      skipStatuses: [...STABILITY_SKIP_STATUSES],
      groupBy: "feature",
    },
    {
      type: "stabilityDistribution",
      title: TITLES.stabilityByEpic,
      threshold: STABILITY_THRESHOLD,
      skipStatuses: [...STABILITY_SKIP_STATUSES],
      groupBy: "epic",
    },
    {
      type: "stabilityDistribution",
      title: TITLES.stabilityByStory,
      threshold: STABILITY_THRESHOLD,
      skipStatuses: [...STABILITY_SKIP_STATUSES],
      groupBy: "story",
    },
    {
      type: "testResultSeverities",
      title: TITLES.testResultSeverities,
    },
    {
      type: "durations",
      title: TITLES.durations,
      groupBy: "none",
    },
    {
      type: "statusAgePyramid",
      title: TITLES.statusAgePyramid,
      limit: 20,
    },
    ...epicStatusDynamics,
  ];
}
