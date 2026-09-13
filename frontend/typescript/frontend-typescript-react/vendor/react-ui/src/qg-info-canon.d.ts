export type QgInfoFileSource = {
  configFile?: string;
  rulesFile?: string;
  knownIssuesFile?: string;
  profile?: string;
  projectKey?: string;
  hrefBase?: string;
  profileHref?: string;
  projectHref?: string;
};

export const QG_INFO_SAMPLE_SOURCE: QgInfoFileSource;

export function createQgInfo(
  content: string | Record<string, unknown>,
  fileSource?: QgInfoFileSource,
): HTMLDivElement;
