# RAG chunks — testing patterns

Retrieval-единицы для агента и bootstrap. **ADR** (`docs/adr/`) — почему и scope; **чанки** — как делать (один `id` = один файл).

Домены синхронизированы с **greedy-token** `routes.yaml`: `config`, `testing`, `testing-header`, `analytics`.

## Формат файла

```yaml
---
id: <stable-id>
domain: config | testing | testing-header | analytics
phase: 4a | 4b | 4.visual
adr: 002 | 003
tags: [config, selenide, ...]
---

# Заголовок

Краткий purpose (1–2 предложения).

## Файлы
## Входы / Assert
## Do
## Don't
```

Правила:
- Один чанк ≈ один паттерн или одна таблица-справочник; без дублирования ADR-контекста.
- `id` совпадает с таблицей в ADR 002 / 003.
- Индекс для ingestion: `manifest.jsonl` (поля `id`, `path`, `domain`, `phase`, `tags`).

## Индекс

### Config (фаза 4a) — `config/`

| id | Файл |
|----|------|
| `e2e-config-keys` | [config/config-keys.md](config/config-keys.md) |
| `cfg-env-profile` | [config/cfg-env-profile.md](config/cfg-env-profile.md) |
| `cfg-base-url` | [config/cfg-base-url.md](config/cfg-base-url.md) |
| `gen-python-policy` | [config/gen-python-policy.md](config/gen-python-policy.md) + `gen-python-policy.json` |
| `ci-workflow-ethalon` | [config/ci-workflow-ethalon.md](config/ci-workflow-ethalon.md) |
| `ci-gradle-args` | [config/ci-gradle-args.md](config/ci-gradle-args.md) |

### Testing (фаза 4a + pyramid) — `testing/`

| id | Файл |
|----|------|
| `e2e-layers` | [testing/layers.md](testing/layers.md) |
| `base-lifecycle` | [testing/base-lifecycle.md](testing/base-lifecycle.md) |
| `po-locators` | [testing/po-locators.md](testing/po-locators.md) |
| `po-fluent` | [testing/po-fluent.md](testing/po-fluent.md) |
| `po-step` | [testing/po-step.md](testing/po-step.md) |
| `test-style-ladder` | [testing/test-style-ladder.md](testing/test-style-ladder.md) |
| `test-taxonomy` | [testing/test-taxonomy.md](testing/test-taxonomy.md) |
| `test-negative` | [testing/test-negative.md](testing/test-negative.md) |
| `test-storage-shortcut` | [testing/test-storage-shortcut.md](testing/test-storage-shortcut.md) |
| `allure-attach` | [testing/allure-attach.md](testing/allure-attach.md) |
| `allure-reporting-requirements` | [testing/allure-reporting-requirements.md](testing/allure-reporting-requirements.md) |
| `allure-selenide-listener` | [testing/allure-selenide-listener.md](testing/allure-selenide-listener.md) |
| `remote-selenoid` | [testing/remote-selenoid.md](testing/remote-selenoid.md) |
| `visual-baseline` | [testing/visual-baseline.md](testing/visual-baseline.md) |
| `test-pyramid` | [testing/test-pyramid.md](testing/test-pyramid.md) |
| `test-layers` | [testing/test-layers.md](testing/test-layers.md) |
| `test-api-layer` | [testing/test-api-layer.md](testing/test-api-layer.md) |
| `test-components` | [testing/test-components.md](testing/test-components.md) |
| `test-manual` | [testing/test-manual.md](testing/test-manual.md) |
| `test-logout-flow` | [testing/test-logout-flow.md](testing/test-logout-flow.md) |

Канон CI: `tests-java/`. Workflow SSOT: `tests-java/.github/_ethalon/`; skill `sync-github-workflows-ethalon`. Учебная ladder: ethalon `tests-java/src/test/java/_ethalon/ladder/` + RAG `test-style-ladder`, `test-pyramid`.

### Header smoke (фаза 4b) — `testing-header/`

| id | Файл |
|----|------|
| `hdr-scope-4b` | [testing-header/hdr-scope-4b.md](testing-header/hdr-scope-4b.md) |
| `hdr-selectors` | [testing-header/hdr-selectors.md](testing-header/hdr-selectors.md) |
| `hdr-legacy-audit` | [testing-header/hdr-legacy-audit.md](testing-header/hdr-legacy-audit.md) |
| `hdr-target` | [testing-header/hdr-target.md](testing-header/hdr-target.md) |
| `hdr-behavior` | [testing-header/hdr-behavior.md](testing-header/hdr-behavior.md) |
| `hdr-layout-gap` | [testing-header/hdr-layout-gap.md](testing-header/hdr-layout-gap.md) |
| `hdr-layout-bp` | [testing-header/hdr-layout-bp.md](testing-header/hdr-layout-bp.md) |
| `hdr-layout-height` | [testing-header/hdr-layout-height.md](testing-header/hdr-layout-height.md) |
| `hdr-viewport` | [testing-header/hdr-viewport.md](testing-header/hdr-viewport.md) |
| `hdr-visual-opt` | [testing-header/hdr-visual-opt.md](testing-header/hdr-visual-opt.md) |
| `hdr-legacy-reject` | [testing-header/hdr-legacy-reject.md](testing-header/hdr-legacy-reject.md) |

## Когда обновлять

Новый testing-паттерн → чанк + строка в `manifest.jsonl` + одна строка в ADR (id → path). Полный ADR переписывать не нужно.

### Analytics (фазы 7.analytics + 8.analytics-grid — завершены)

Чанки `alr-*` — домен `analytics`:

| id | Содержание | Статус |
|----|------------|--------|
| `alr-quality-gate` | `allureQualityGate`, `known.json`, CI enforcement | ✓ `analytics/alr-quality-gate.md` |
| `alr-agent-mode` | `allure agent inspect/query`, когда agent vs raw JSON | ✓ `analytics/alr-agent-mode.md` |
| `alr-data-sources` | results, history, agent-output, `analytics-index.json` | ✓ `analytics/alr-data-sources.md` |
| `alr-metrics-catalog` | Tier 1–3 метрики + формулы | ✓ `analytics/alr-metrics-catalog.md` |
| `alr-chart-matrix` | chart type → метрика | ✓ `analytics/alr-chart-matrix.md` |
| `alr-dashboard-layout` | сетка preview, URL probe, linked filters | ✓ `analytics/alr-dashboard-layout.md` |
| `alr-hook-shell` | `allure-shell.js` iframe + custom panel | ✓ `analytics/alr-hook-shell.md` |
| `alr-grid-live` | DIY grid, SVG sparklines, live feed | ✓ `analytics/alr-grid-live.md` |

План фазы 8: `docs/plans/8-analytics-grid.md` · skill `allure-dashboard-grid` (**active**). Follow-up: epic click-filter в preview.
