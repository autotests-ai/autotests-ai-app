# ADR 003: Header smoke e2e — scope, assertions, legacy audit

**Статус:** принято (scope shift 2026-07 — см. ниже)  
**Дата:** 2026-06-30  
**Связано:** ADR 002 (слои e2e), `docs/layout-standard.md`

### Status update (2026-07)

Канон CI **не** использует harness PO (`HeaderTests`, `HeaderPreviewPage`, `HeaderComponent`, `HeaderLayout`). Header покрыт:

- **component** — `LangToggleTests` на `components.html`
- **integration** — `LoginEmbedTests` на `login.html` (embed, фаза 6)

`frontend/header.html` — preview/playground only. RAG scope: `hdr-scope-4b`. Структура ниже — historical reference для legacy audit.

## Контекст

Фаза **4b** — header smoke на `frontend/header.html` (harness) в template-project. Фаза **4a** (login на one-page-form) завершена; ADR 002 фиксирует общие слои e2e, но не header.

В `tests-java/legacy-code/` лежат AI-generated тесты против **consumer** one-page-form: поведение header, layout probes, screenshot diff, landing/dashboard. Селекторы и DOM **не совпадают** с каноном template-project (`templates/header.html`).

Нужно зафиксировать scope и assertions до реализации. Паттерны для retrieval: **`docs/rag/testing-header/`**.

## Решение

### Scope фазы 4b

| Параметр | Канон |
|----------|-------|
| Target page | `frontend/header.html` (harness; gallery — `header-examples.html`) |
| Target app root | `http://localhost:3000/` — сервер cwd = `frontend/` (см. `local_e2e.properties`) |
| Breakpoint | **768px** — `docs/layout-standard.md` |
| Viewports для smoke | **390**, **768**, **1280** (edge: 769 desktop, 768 mobile) |
| Epic Allure | **`Template Header`** — не смешивать с `@Epic("One Page Form")` |
| Чат / PR | Только header e2e; login-тесты и `frontend/css/header.css` не трогать без запроса |

### Стратегия assertions (порядок внедрения)

**Фаза 4b.1 — обязательно (первый PR):**

1. **Behavioral smoke** — mount, href, theme toggle, lang label (без скриншотов).
2. **Layout probes** — `executeJavaScript` + `getBoundingClientRect` / `getComputedStyle`:
   - uniform gap на `.header__inner` = **`--space-4` (16px)**, tolerance ≤ 0.6px;
   - header height ≈ **56px** (`--header-height`);
   - desktop (>768px): `.header__nav`, `.header__search` visible;
   - mobile (≤768px): `.header__nav`, `.header__search` hidden.

**Фаза 4b.2 — opt-in (отдельный PR + явное обоснование):**

3. **Screenshot diff** — pixel compare vs baseline PNG; флаг `-DupdateBaselines=true` (общий для всех `@Tag("visual")`, см. `visual-baseline`). Не смешивать с layout probes в одном `@Test`.

**Не в scope 4b:** landing page, Allure dashboard iframe, cross-page position reference на 5+ страницах one-page-form.

### Селекторы (template-project, не legacy)

Источник правды: `templates/header.html`, `frontend/js/header.js`.

| Роль | `data-testid` |
|------|----------------|
| Корень | `header` |
| Brand | `header-brand-link` |
| Nav | `header-nav`, `header-nav-home`, … |
| Tools | `header-tools`, `header-lang-toggle`, `header-lang-label`, `header-theme-toggle`, `header-github`, `header-github-pages` |

Layout-контейнер для gap probe: `.header__inner` (класс стабилен по `layout-standard.md`).

**Не использовать** legacy-селекторы: `.header-left`, `[data-testid='nav-tools']`, `forms-link`, `#lang-menu`, `#lang-label`.

### Legacy audit (`tests-java/legacy-code/`)

| Источник | Вердикт | Действие |
|----------|---------|----------|
| `HeaderControlsTests` / `HeaderControls.java` | **Взять идею** | Поведенческий smoke; переписать селекторы под `header-*` |
| `NavLayout.java` (gap/position scripts) | **Взять паттерн** | Новый helper под `.header__inner`; gap **16px**, не 12 |
| `ViewportHelper.java` | **Взять** | CDP `setDeviceMetricsOverride` для стабильных viewports |
| `LayoutCss.java` | **Взять константу** | `RESPONSIVE_BREAKPOINT_PX = 768` |
| `NavScreenshot.java` | **Отложить** | Только 4b.2; не в первом PR |
| `NavStabilityVisualTests` | **Отклонить** | Cross-page + consumer DOM |
| `NavSpacingVisualTests` (dashboard half) | **Отклонить** | `.card-header-dashboard` — не header |
| `LandingPage*`, `DashboardLayoutTests` | **Отклонить** | Вне scope header |
| `BrowserSessionHelper.openDemoPage` | **Не копировать** | Для header достаточно `open("/header.html")` + при необходимости reset storage |

### Структура кода (слои ADR 002)

```
tests-java/src/test/java/
├── helpers/
│   ├── ViewportHelper.java      # из legacy, без изменений по смыслу
│   └── HeaderLayout.java        # gap/height/visibility probes (новый, не NavLayout)
├── pages/
│   ├── components/
│   │   └── HeaderComponent.java # locators + @Step theme/lang/layout
│   └── HeaderPreviewPage.java   # open harness /header.html → HeaderComponent
└── tests/
    └── HeaderTests.java         # @Epic Template Header, @Tag smoke layout
```

Screenshot helper (visual): `helpers/ScreenshotBaseline.java` — **общий** для всех epic; header использует тот же helper. Не смешивать с `HeaderLayout`.

### Config

- Профиль `local_e2e` (и sibling suffixes): `baseUrl=http://localhost:3000/`, сервер cwd = `frontend/`.
- Login и header: `./gradlew test -Denv=local_e2e -DincludeTags=smoke -DexcludeTags=visual`; PO — `open("/login.html")`, `open("/header.html")`.
- Приоритет base URL — как в ADR 002 (`cfg-base-url`).

### Allure taxonomy

| Label | Значение |
|-------|----------|
| `@Epic` | `Template Header` |
| `@Feature` | `Header smoke` / `Header layout` |
| `@Tag` | `smoke`, `layout` (behavior); `visual` — только при screenshot (4b.2) |
| `@Layer` | `e2e` |

## Паттерны (RAG)

Индекс: [`docs/rag/README.md`](../rag/README.md). Чанки: `docs/rag/testing-header/<id>.md`.

| id | chunk |
|----|-------|
| `hdr-scope-4b` | scope, viewports, 4b.1 / 4b.2 |
| `hdr-selectors` | data-testid template-project |
| `hdr-legacy-audit` | таблица legacy-code |
| `hdr-target` | baseUrl / open header harness |
| `hdr-behavior` | theme, lang, href smoke |
| `hdr-layout-gap` | gap 16px на .header__inner |
| `hdr-layout-bp` | nav hide ≤768 |
| `hdr-layout-height` | height 56px |
| `hdr-viewport` | CDP viewport helper |
| `hdr-visual-opt` | header element screenshot (extends `visual-baseline`) |
| `hdr-legacy-reject` | anti-patterns |

## Последствия

- Чат фазы 4b стартует по ADR 003; prerequisite закрыт.
- `tests-java/README.md` — секция header smoke после реализации.
- `legacy-code/` остаётся архивом; не удалять до завершения 4b.1 (reference при портировании helpers).
- Screenshot baselines потребуют дополнения ADR или секции 4b.2 при включении в CI.
