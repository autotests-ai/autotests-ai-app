# Test coverage (frontend-typescript-react)

**`@vitest/coverage-v8`** on RTL / jsdom. Playwright and Selenide hitting this SPA are **N/A** for the % gate.

| Scope | Tool | Line gate | Command |
|--------|------|-----------|---------|
| `src/` RTL (excl. `src/test/**`, `src/main.tsx`, `src/styles.ts`) | **`@vitest/coverage-v8`** | **100%** lines in `vitest.config.ts` | `npm run test:coverage` |
| Playwright / Selenide e2e → this SPA | — | **N/A** | — |

Not this module: c8, Istanbul provider, Codecov, Cobertura, `stacks/` leftover frontend.

## Reports

`provider: 'v8'`, `reporter: ['text', 'lcov', 'html']`, `reportsDirectory: './coverage'` (`coverage/` gitignored).

```bash
npm run test:coverage
open coverage/index.html
```

| Artifact | Path |
|----------|------|
| HTML | `coverage/index.html` |
| lcov | `coverage/lcov.info` |
