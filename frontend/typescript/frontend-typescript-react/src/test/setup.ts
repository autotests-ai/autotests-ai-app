import '@testing-library/jest-dom/vitest';
import { displayName, feature, label, suite } from 'allure-js-commons';
import { beforeEach } from 'vitest';

/** Shared Allure labels for component results (local and CI → TestOps). */
beforeEach(async (ctx) => {
  await label('layer', 'component');
  await label('owner', 'stanislav');
  await label('module', 'frontend-typescript-react');
  await label('language', 'typescript');
  await label('scope', 'react');
  await label('framework', 'react_testing_library');
  await label('epic', 'autotests-ai-app');

  // TestOps Suites groups by suite/feature (parentSuite alone stays flat).
  // describe() → folder; it() → display name. No per-test annotations needed.
  const suiteName = ctx.task.suite?.name?.trim();
  if (suiteName) {
    await suite(suiteName);
    await feature(suiteName);
  }

  const testName = ctx.task.name?.trim();
  if (testName) {
    await displayName(testName);
  }
});
