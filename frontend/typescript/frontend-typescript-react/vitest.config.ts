/// <reference types="vitest/config" />

import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import AllureReporter from 'allure-vitest/reporter';
import { defineConfig } from 'vite';

const reactUiSrc = resolve(__dirname, 'vendor/react-ui/src/index.ts');

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    // vendor/react-ui imports `react` by name — keep this package's copy so the
    // alias does not pick up a second React higher in the tree ("Invalid hook call").
    dedupe: ['react', 'react-dom'],
    alias: {
      '@zero-design-system/react': reactUiSrc,
    },
  },
  server: {
    fs: {
      allow: [__dirname],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts', 'allure-vitest/setup'],
    include: ['src/test/**/*.test.{ts,tsx}'],
    // Vitest 4 tags. Declared here because `strictTags` (default) rejects any tag
    // the config does not know about, so a typo fails the run instead of silently
    // matching nothing. Filter with `npm run test:smoke`.
    tags: [{ name: 'smoke', description: 'App shell mounts and the routes resolve' }],
    css: true,
    // Reporter instance, not the `['allure-vitest/reporter', …]` string form:
    // that specifier can resolve to an allure-vitest hoisted above this module,
    // which then injects a second Vitest runtime (setup + runner) into the worker.
    reporters: ['default', new AllureReporter({ resultsDir: 'allure-results' })],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}', 'src/pwa/pwa-register.js'],
      // main.tsx / styles.ts are bootstrap (createRoot, CSS imports) — same omit as
      // Java MultistackApplication. Nothing to assert in jsdom.
      // vendor/ is the in-tree DS alias (ethalon keeps the same kit outside this package).
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/main.tsx', 'src/styles.ts', 'vendor/**'],
      thresholds: {
        lines: 100,
        statements: 100,
        branches: 100,
        functions: 100,
      },
    },
  },
});
