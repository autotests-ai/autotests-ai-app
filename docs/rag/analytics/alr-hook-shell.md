---
id: alr-hook-shell
domain: analytics
phase: 8.dashboard
tags: [allure, dashboard, shell, iframe, highcharts]
---
# Allure shell hook (dashboard harness)

**id:** `alr-hook-shell`

## Файлы

| Файл | Роль |
|------|------|
| `frontend/allure-shell.js` | iframe load, theme sync, resize, `AllureShell.*` API |
| `frontend/allure-shell.css` | `.panel-card-dashboard`, `.dashboard-frame`, `.metrics-panel` |
| `frontend/allure-dashboard.html` | Harness: header embed + metrics + iframe |
| `frontend/js/allure-dashboard.js` | URL probe, theme bridge, Highcharts init |
| `frontend/dashboard-overrides.css` | CSS overrides внутри iframe srcdoc |
| `frontend/css/chart-tile.css` | Примитив контейнера chart |

Skill: `.cursor/skills/allure-dashboard-layout/`

## DOM-контракт

```html
<iframe
  id="dashboard-frame"
  class="dashboard-frame"
  data-dashboard-url="<absolute-or-relative-dashboard-index>"
  title="Allure dashboard"
></iframe>
```

- `allure-shell.js` на `DOMContentLoaded` → `loadDashboardFrame` (fetch HTML → `srcdoc` + `<base>` + overrides link).
- `data-dashboard-ready="true"` после load — e2e может ждать attribute (consumer pattern).

## Theme sync

| Источник | Механизм |
|----------|----------|
| Canonical header | `document.documentElement.classList` `theme-light` → light/dark |
| Allure iframe | `localStorage.theme` JSON + `data-theme` на iframe document |
| Shell chrome | `data-theme` на host + `dashboard-theme-change` event |
| Highcharts | `chart.update({ chart: { backgroundColor } })` в `allure-dashboard.js` |

Bridge: click `[data-testid="header-theme-toggle"]` → `AllureShell.applyDashboardTheme(frame, theme)`.

## Локальный report

```bash
cd tests-java && ./gradlew allureReport
ln -sfn ../tests-java/build/reports/allure-report/allureReport ../frontend/allure-report
# HTTP cwd = frontend/, :3000
```

Dashboard path в report: `dashboard/index.html` (RU) — язык Allure из `allurerc.json` `reportLanguage`.

## Custom vs native

| Зона | Технология | Когда |
|------|------------|-------|
| iframe | Allure 3 dashboard plugin | history, pyramid, dynamics из `allurerc.json` |
| `.metrics-panel` | Highcharts + `.chart-tile` | KPI не в native plugin, CI badges, linked filters (фаза 8) |

Decision matrix — RAG `alr-native-vs-custom` (planned).
