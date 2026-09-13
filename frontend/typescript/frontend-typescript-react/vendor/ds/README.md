# vendor/ds

**Vendor** design-system runtime snapshot for autotests-ai-app landing.

SSOT is `projects/design-system-home/design-system/` (`css/`, `js/`, `templates/`).
This tree is the **existing slice** (not the full css catalog). Do not edit by hand.

Product overlay (not copied from design-system): `js/app-base.js`,
`js/env-hosts.js`, `js/env-hosts.d.ts`.

Refresh: copy files that already live here from the SSOT. Do not `rsync --delete`
(that would wipe overlay). Do not run etalon `frontend/scripts/sync-ds-runtime.sh`.

Packed into the frontend nginx image as `vendor/ds` (module `Dockerfile`).
