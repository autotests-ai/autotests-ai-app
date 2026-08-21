# frontend-javascript-app

**Vendor** lean design-system runtime snapshot — not etalon.

SSOT is `projects/design-system-home/design-system/` (`css/`, `js/`, `templates/`).
Do not edit this tree by hand; refresh from the ethalon or live clone root:

```bash
bash frontend/scripts/sync-ds-runtime.sh
```

Product overlay (not copied from design-system): `js/app-base.js`,
`js/env-hosts.js` (from `sync-stack-matrix.py`).

The `/stack/` board is not in this snapshot — inbox
`projects/autotests-ai-home/stack-matrix/overlay/`.

Packed into each frontend nginx image as `vendor/ds` (module `Dockerfile`).
