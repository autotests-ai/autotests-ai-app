# frontend-react-ui

**Vendor** copy of monorepo `projects/design-system-home/react-ui/src` — not etalon.
TSX/.ts wrappers only (no `src/styles`). Primitive CSS is the javascript-app snapshot
(`sync-ds-runtime.sh`); the product imports it from `src/styles.ts`, not a package barrel.

**Deliberately test-stripped:** the sync excludes `*.test.tsx` / `test/` / `styles/`.
Component quality is guaranteed upstream in `projects/design-system-home/react-ui`;
this copy is a build artifact — do not edit by hand, re-run the sync instead.

Refresh from the ethalon or live clone root:

```bash
bash frontend/scripts/sync-react-ui.sh
```

Consumed via Vite alias `@zero-design-system/react` → `src/index.ts`.
