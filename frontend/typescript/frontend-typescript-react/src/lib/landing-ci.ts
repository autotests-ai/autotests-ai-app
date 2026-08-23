import type { LandingConfig } from './landing-config';

export type CiFlavor = 'github' | 'gitlab' | 'jenkins';

/** Host/runner → workflow dialect. Jenkins wins; else GitLab if either axis says so. */
export function ciFlavor(config: LandingConfig): CiFlavor {
  if (config.ciRunner === 'jenkins') {
    return 'jenkins';
  }
  if (config.ciRunner.startsWith('gitlab') || config.codeHost.startsWith('gitlab')) {
    return 'gitlab';
  }
  return 'github';
}

export function ciFilename(config: LandingConfig): string {
  const flavor = ciFlavor(config);
  if (flavor === 'jenkins') {
    return 'Jenkinsfile';
  }
  if (flavor === 'gitlab') {
    return '.gitlab-ci.yml';
  }
  return 'ci.yml';
}

function testCommand(config: LandingConfig): string {
  const language = config.testsLanguage;
  if (language === 'javascript' || language === 'typescript') {
    return 'npm test';
  }
  if (language === 'python') {
    return 'pytest';
  }
  if (language === 'go') {
    return 'go test ./...';
  }
  if (config.buildTool === 'maven') {
    return config.buildWrapper === 'wrapper' ? './mvnw -B test' : 'mvn -B test';
  }
  return config.buildWrapper === 'wrapper' ? './gradlew test' : 'gradle test';
}

function cacheOn(config: LandingConfig): boolean {
  return config.ciCache === 'true';
}

function githubRunsOn(config: LandingConfig): string {
  if (config.ciRunner === 'github-self-hosted') {
    return '[self-hosted]';
  }
  if (config.buildOs === 'windows') {
    return 'windows-latest';
  }
  if (config.buildOs === 'mac') {
    return 'macos-latest';
  }
  return config.buildOsVersion.startsWith('ubuntu') ? config.buildOsVersion : 'ubuntu-latest';
}

function githubSetup(config: LandingConfig): string[] {
  const language = config.testsLanguage;
  const cache = cacheOn(config);
  if (language === 'javascript' || language === 'typescript') {
    const lines = [
      '      - uses: actions/setup-node@v4',
      '        with:',
      "          node-version: '22'",
    ];
    if (cache) {
      lines.push('          cache: npm');
    }
    return lines;
  }
  if (language === 'python') {
    const lines = [
      '      - uses: actions/setup-python@v5',
      '        with:',
      "          python-version: '3.12'",
    ];
    if (cache) {
      lines.push('          cache: pip');
    }
    return lines;
  }
  if (language === 'go') {
    const lines = [
      '      - uses: actions/setup-go@v5',
      '        with:',
      "          go-version: '1.23'",
    ];
    if (cache) {
      lines.push('          cache: true');
    }
    return lines;
  }
  const lines = [
    '      - uses: actions/setup-java@v4',
    '        with:',
    '          distribution: temurin',
    `          java-version: '${config.javaVersion}'`,
  ];
  if (cache) {
    lines.push(`          cache: ${config.buildTool === 'maven' ? 'maven' : 'gradle'}`);
  }
  return lines;
}

function gitlabImage(config: LandingConfig): string {
  const language = config.testsLanguage;
  if (language === 'javascript' || language === 'typescript') {
    return 'node:22';
  }
  if (language === 'python') {
    return 'python:3.12';
  }
  if (language === 'go') {
    return 'golang:1.23';
  }
  return `eclipse-temurin:${config.javaVersion}-jdk`;
}

function gitlabCachePaths(config: LandingConfig): string[] {
  const language = config.testsLanguage;
  if (language === 'javascript' || language === 'typescript') {
    return ['node_modules/'];
  }
  if (language === 'python') {
    return ['.cache/pip'];
  }
  if (language === 'go') {
    return ['.cache/go-build'];
  }
  return config.buildTool === 'maven' ? ['.m2/repository'] : ['.gradle/caches'];
}

function axesComment(config: LandingConfig): string {
  return `# testops: ${config.testops} · sonar: ${config.sonar} · jira: ${config.jira} · tests: ${config.tests}`;
}

function toGithubYaml(config: LandingConfig, vectorId: string): string {
  const lines = [
    `# ${vectorId} — live preview; not the teaching orchestrator`,
    axesComment(config),
    'name: ci',
    'on:',
    '  push:',
    '    branches: [main]',
    '  pull_request:',
    'env:',
    `  ALLURE_ENDPOINT: \${{ secrets.ALLURE_ENDPOINT }}`,
    `  SONAR_HOST_URL: \${{ secrets.SONAR_HOST_URL }}`,
    'jobs:',
    '  test:',
    `    runs-on: ${githubRunsOn(config)}`,
    '    steps:',
    '      - uses: actions/checkout@v4',
    ...githubSetup(config),
    `      - run: ${testCommand(config)}`,
  ];
  return lines.join('\n');
}

function toGitlabYaml(config: LandingConfig, vectorId: string): string {
  const lines = [
    `# ${vectorId} — live preview; not the teaching orchestrator`,
    axesComment(config),
    'stages:',
    '  - test',
    'variables:',
    '  ALLURE_ENDPOINT: $ALLURE_ENDPOINT',
    '  SONAR_HOST_URL: $SONAR_HOST_URL',
    'test:',
    '  stage: test',
    `  image: ${gitlabImage(config)}`,
  ];
  if (config.ciRunner === 'gitlab-self-hosted') {
    lines.push('  tags:', '    - self-hosted');
  }
  if (cacheOn(config)) {
    lines.push('  cache:', '    paths:');
    for (const path of gitlabCachePaths(config)) {
      lines.push(`      - ${path}`);
    }
  }
  lines.push('  script:', `    - ${testCommand(config)}`);
  return lines.join('\n');
}

function toJenkinsfile(config: LandingConfig, vectorId: string): string {
  return [
    `// ${vectorId} — live preview; not the teaching orchestrator`,
    `// testops: ${config.testops} · sonar: ${config.sonar} · jira: ${config.jira} · tests: ${config.tests}`,
    'pipeline {',
    "    agent { label 'jenkins' }",
    `    // ciCache: ${cacheOn(config) ? 'enabled' : 'off'}`,
    '    environment {',
    "        ALLURE_ENDPOINT = credentials('allure-endpoint')",
    "        SONAR_HOST_URL = credentials('sonar-host-url')",
    '    }',
    '    stages {',
    "        stage('test') {",
    '            steps {',
    `                sh '${testCommand(config)}'`,
    '            }',
    '        }',
    '    }',
    '}',
  ].join('\n');
}

/** Thin workflow from Home axes. Not autotests-ai-multistack teaching ci.yml. */
export function toCiYaml(config: LandingConfig, vectorId: string): string {
  const flavor = ciFlavor(config);
  if (flavor === 'jenkins') {
    return toJenkinsfile(config, vectorId);
  }
  if (flavor === 'gitlab') {
    return toGitlabYaml(config, vectorId);
  }
  return toGithubYaml(config, vectorId);
}
