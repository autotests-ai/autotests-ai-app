export type SparklineTheme = {
  accent: string;
  pass: string;
  fail: string;
  broken: string;
  skip: string;
};

export type SparklineHistoryPoint = {
  durationSec?: number;
};

export type SparklineLang = 'ru' | 'en';

export function sparklineThemeFromSite(
  siteTheme: 'light' | 'dark',
): SparklineTheme;

export function buildSparkline(
  history: readonly SparklineHistoryPoint[] | null | undefined,
  theme: SparklineTheme,
  options?: {
    emptyLabel?: string;
    lang?: SparklineLang;
    width?: number;
    height?: number;
    stroke?: string;
  },
): HTMLElement;
