import { describe, expect, it } from 'vitest';
import { ciFilename, ciFlavor, toCiYaml } from '../../lib/landing-ci';
import { cloneConfig, DEFAULTS, type LandingConfig } from '../../lib/landing-config';

function cfg(partial: Partial<LandingConfig>): LandingConfig {
  return { ...cloneConfig(DEFAULTS), ...partial };
}

describe('landing-ci', () => {
  it('picks GitHub, GitLab, or Jenkins from runner and host', () => {
    expect(ciFlavor(DEFAULTS)).toBe('github');
    expect(ciFlavor(cfg({ ciRunner: 'github-self-hosted' }))).toBe('github');
    expect(ciFlavor(cfg({ ciRunner: 'gitlab-hosted' }))).toBe('gitlab');
    expect(ciFlavor(cfg({ codeHost: 'gitlab.com/qa-guru', ciRunner: 'github-hosted' }))).toBe(
      'gitlab',
    );
    expect(ciFlavor(cfg({ ciRunner: 'jenkins', codeHost: 'gitlab.qa.guru' }))).toBe('jenkins');
  });

  it('names the file after the flavor', () => {
    expect(ciFilename(DEFAULTS)).toBe('ci.yml');
    expect(ciFilename(cfg({ ciRunner: 'gitlab-hosted' }))).toBe('.gitlab-ci.yml');
    expect(ciFilename(cfg({ ciRunner: 'jenkins' }))).toBe('Jenkinsfile');
  });

  it('emits a thin GitHub workflow from Home defaults', () => {
    const yaml = toCiYaml(DEFAULTS, 'vector#deadbeef');
    expect(yaml).toContain('# vector#deadbeef — live preview; not the teaching orchestrator');
    expect(yaml).toContain('testops: selfhosted');
    expect(yaml).toContain('name: ci');
    expect(yaml).toContain('runs-on: ubuntu-24.04');
    expect(yaml).toContain('cache: gradle');
    expect(yaml).toContain("java-version: '21'");
    expect(yaml).toContain('run: ./gradlew test');
    expect(yaml).toContain(`\${{ secrets.ALLURE_ENDPOINT }}`);
  });

  it('drops GitHub setup cache when ciCache is off', () => {
    const yaml = toCiYaml(cfg({ ciCache: 'false' }), 'vector#off');
    expect(yaml).not.toContain('cache: gradle');
    expect(yaml).toContain('uses: actions/setup-java@v4');
  });

  it('maps GitHub runs-on from runner and OS', () => {
    expect(toCiYaml(cfg({ ciRunner: 'github-self-hosted' }), 'v')).toContain(
      'runs-on: [self-hosted]',
    );
    expect(toCiYaml(cfg({ buildOs: 'windows' }), 'v')).toContain('runs-on: windows-latest');
    expect(toCiYaml(cfg({ buildOs: 'mac' }), 'v')).toContain('runs-on: macos-latest');
    expect(toCiYaml(cfg({ buildOs: 'linux', buildOsVersion: 'debian-12' }), 'v')).toContain(
      'runs-on: ubuntu-latest',
    );
  });

  it('picks GitHub setup and test command from tests language and build tool', () => {
    expect(toCiYaml(cfg({ testsLanguage: 'javascript' }), 'v')).toContain('cache: npm');
    expect(toCiYaml(cfg({ testsLanguage: 'javascript' }), 'v')).toContain('run: npm test');
    expect(toCiYaml(cfg({ testsLanguage: 'typescript' }), 'v')).toContain("node-version: '22'");
    expect(toCiYaml(cfg({ testsLanguage: 'javascript', ciCache: 'false' }), 'v')).not.toContain(
      'cache: npm',
    );

    expect(toCiYaml(cfg({ testsLanguage: 'python' }), 'v')).toContain('cache: pip');
    expect(toCiYaml(cfg({ testsLanguage: 'python' }), 'v')).toContain('run: pytest');
    expect(toCiYaml(cfg({ testsLanguage: 'python', ciCache: 'false' }), 'v')).not.toContain(
      'cache: pip',
    );

    expect(toCiYaml(cfg({ testsLanguage: 'go' }), 'v')).toContain('cache: true');
    expect(toCiYaml(cfg({ testsLanguage: 'go' }), 'v')).toContain('run: go test ./...');
    expect(toCiYaml(cfg({ testsLanguage: 'go', ciCache: 'false' }), 'v')).not.toContain(
      'cache: true',
    );

    const maven = toCiYaml(cfg({ buildTool: 'maven', buildWrapper: 'wrapper' }), 'v');
    expect(maven).toContain('cache: maven');
    expect(maven).toContain('run: ./mvnw -B test');

    expect(toCiYaml(cfg({ buildTool: 'maven', buildWrapper: 'system' }), 'v')).toContain(
      'run: mvn -B test',
    );
    expect(toCiYaml(cfg({ buildWrapper: 'system' }), 'v')).toContain('run: gradle test');
    expect(toCiYaml(cfg({ testsLanguage: 'kotlin' }), 'v')).toContain('setup-java@v4');
  });

  it('emits GitLab CI with image, optional tags, and cache paths', () => {
    const hosted = toCiYaml(cfg({ ciRunner: 'gitlab-hosted' }), 'vector#gl');
    expect(hosted).toContain('stages:');
    expect(hosted).toContain('image: eclipse-temurin:21-jdk');
    expect(hosted).toContain('.gradle/caches');
    expect(hosted).toContain('- ./gradlew test');
    expect(hosted).not.toContain('tags:');

    const self = toCiYaml(cfg({ ciRunner: 'gitlab-self-hosted' }), 'v');
    expect(self).toContain('tags:');
    expect(self).toContain('- self-hosted');

    expect(toCiYaml(cfg({ ciRunner: 'gitlab-hosted', ciCache: 'false' }), 'v')).not.toContain(
      'cache:',
    );

    expect(
      toCiYaml(cfg({ ciRunner: 'gitlab-hosted', testsLanguage: 'javascript' }), 'v'),
    ).toContain('image: node:22');
    expect(
      toCiYaml(cfg({ ciRunner: 'gitlab-hosted', testsLanguage: 'javascript' }), 'v'),
    ).toContain('node_modules/');
    expect(
      toCiYaml(cfg({ ciRunner: 'gitlab-hosted', testsLanguage: 'typescript' }), 'v'),
    ).toContain('image: node:22');
    expect(toCiYaml(cfg({ ciRunner: 'gitlab-hosted', testsLanguage: 'python' }), 'v')).toContain(
      'image: python:3.12',
    );
    expect(toCiYaml(cfg({ ciRunner: 'gitlab-hosted', testsLanguage: 'python' }), 'v')).toContain(
      '.cache/pip',
    );
    expect(toCiYaml(cfg({ ciRunner: 'gitlab-hosted', testsLanguage: 'go' }), 'v')).toContain(
      'image: golang:1.23',
    );
    expect(toCiYaml(cfg({ ciRunner: 'gitlab-hosted', testsLanguage: 'go' }), 'v')).toContain(
      '.cache/go-build',
    );
    expect(toCiYaml(cfg({ ciRunner: 'gitlab-hosted', buildTool: 'maven' }), 'v')).toContain(
      '.m2/repository',
    );
  });

  it('emits a Jenkinsfile and flips the cache comment', () => {
    const on = toCiYaml(cfg({ ciRunner: 'jenkins' }), 'vector#jk');
    expect(on).toContain('pipeline {');
    expect(on).toContain('// ciCache: enabled');
    expect(on).toContain("sh './gradlew test'");
    expect(on).toContain('testops: selfhosted');

    expect(toCiYaml(cfg({ ciRunner: 'jenkins', ciCache: 'false' }), 'v')).toContain(
      '// ciCache: off',
    );
    expect(toCiYaml(cfg({ ciRunner: 'jenkins', testsLanguage: 'python' }), 'v')).toContain(
      "sh 'pytest'",
    );
  });
});
