# vendor/react-ui

**Vendor** copy of monorepo `projects/design-system-home/react-ui/src`.
TSX/.ts wrappers only (no `src/styles`). Primitive CSS is `vendor/ds`;
the product imports it from `src/styles.ts`, not a package barrel.

**Deliberately test-stripped:** excludes `*.test.tsx` / `test/` / `styles/`.
Component quality is guaranteed upstream in `projects/design-system-home/react-ui`;
this copy is a build artifact — do not edit by hand.

Refresh from monorepo SSOT (`projects/design-system-home/react-ui/src`), not etalon
`frontend/scripts/sync-react-ui.sh`.

Consumed via Vite alias `@zero-design-system/react` → `src/index.ts`.
