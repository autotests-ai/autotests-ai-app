export type SparklineTheme = {
  accent: string;
  pass: string;
  fail: string;
  broken: string;
  skip: string;
};

export type StabilityHistoryPoint = {
  status?: string;
};

export type StabilityLang = 'ru' | 'en';

export function sparklineThemeFromSite(
  siteTheme: 'light' | 'dark',
): SparklineTheme;

export function statusSparkColor(
  status: string | undefined,
  theme: SparklineTheme,
): string;

export function stabilityStatusLabel(
  status: string,
  lang?: StabilityLang,
): string;

export function buildStabilityCell(
  flakyFlips: number | undefined,
  history: readonly StabilityHistoryPoint[] | null | undefined,
  theme: SparklineTheme,
  options?: {
    lang?: StabilityLang;
    flipsLabel?: string;
    limit?: number;
  },
): HTMLElement;
