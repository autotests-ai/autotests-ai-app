# vendor/design-system

JS graph for react-ui `*-canon.js` re-exports.

From `vendor/react-ui/src`, SSOT paths are `../../design-system/js/*.js`
(monorepo: `design-system-home/design-system/js`). This sibling matches that
relative path so Vite can bundle the barrel without a monorepo checkout.

Not the landing CSS/runtime slice (`vendor/ds`). Not overlay (`app-base.js`,
`env-hosts.js`). Do not `rsync --delete` over `vendor/ds`.

Refresh from `projects/design-system-home/design-system/js/` (files listed
below). Keep in lockstep with the canon wrappers in `vendor/react-ui/src`.
