// Design-system lean runtime (vendor/ds) + product CSS in this module.
// Bundled so the Vite build is self-contained for Docker/GHA.
import '../vendor/ds/css/tokens.css';
import '../vendor/ds/css/link.css';
import '../vendor/ds/css/input.css';
import '../vendor/ds/css/icon.css';
import '../vendor/ds/css/icon-btn.css';
import '../vendor/ds/css/lang-toggle.css';
import '../vendor/ds/css/poll-toggle.css';
import '../vendor/ds/css/header.css';
import '../vendor/ds/css/button.css';
import '../vendor/ds/css/panel.css';
import '../vendor/ds/css/badge.css';
import '../vendor/ds/css/plaque-field.css';
import '../vendor/ds/css/sticky.css';
import '../vendor/ds/css/stack.css';
import '../vendor/ds/css/code-highlight.css';
import '../css/grid.css';
// grid.css before configurator.css — same specificity (.grid--2x1 vs
// .configurator__layout--terminal). Later file would pin 1fr 1fr and kill the 6-col clamp.
import '../vendor/ds/css/configurator.css';
import '../css/text.css';
import '../css/page.css';
import '../css/stack-page.css';
import '../css/app.css';
