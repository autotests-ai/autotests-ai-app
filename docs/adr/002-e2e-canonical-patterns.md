# ADR 002: E2e эталон — login form

**Статус:** принято  
**Дата:** 2026-06-30

## Контекст

Фаза 4 template-project: переносимый эталон e2e для портирования на другие языки/стеки.

Паттерны для retrieval вынесены в **`docs/rag/testing/`** (`manifest.jsonl`). ADR фиксирует решение и scope; чанки — как реализовать.

Roadmap (`docs/CONTEXT.md`, `layout-standard.md`) упоминает **header smoke / visual tests**. Текущий `tests-java/` после очистки содержит **login-сценарии** на reference app [one-page-form](https://github.com/qa-guru/one-page-form), не header.

## Решение

### Scope фазы 4a (этот ADR)

1. **`tests-java/`** — единственный канон стиля и структуры e2e в template-project.
2. **Target app:** `frontend/` — единый static root (`login.html`, `header.html`, …); prod `baseUrl` на GitHub Pages one-page-form.
3. **Сценарии:** login e2e smoke в каноне; negative/ladder/logout patterns — ethalon `_ethalon/ladder/` + RAG (`test-style-ladder`, `test-logout-flow`, `test-negative`). Header smoke — **фаза 4b**, ADR `003`.
4. **Testing pyramid (4.pyramid):** `@Layer` unit / component / integration / api / e2e / manual + CI slices (`testVisual`, …) — чанки `test-pyramid`, `test-api-layer` (ADR 004, 005).

### Слои (stack-agnostic)

| Слой | Назначение |
|------|------------|
| `config/` | Env profiles, typed keys, merge system props |
| `TestBase` | Driver setup once; teardown artifacts + close driver |
| `pages/` | Page Objects, locators, `@Step` |
| `tests/` | JUnit classes, Allure taxonomy, tags |
| `allure/` | Attachment helpers |
| `annotations/` | Cross-cutting labels (`@Layer`) |

### Base URL resolution

Приоритет: `-DbaseUrl` / `baseUrl` в профиле → `-DbasePath` / `basePath`. Оба пустые — fail fast.

Local HTTP: сервер из **`frontend/`**, `baseUrl=http://localhost:3000/`. PO: `open("/login.html")`, `open("/header.html")` — без отдельных path keys.

**Один `./gradlew test` — один стенд** (`Configuration.baseUrl` в `@BeforeAll`). Smoke, screenshot baseline — отдельные прогоны / env-профили.

### Config keys (канон)

| Key | Default | Назначение |
|-----|---------|------------|
| `env` | `local_e2e` | Имя файла `config/${env}.properties` (Gradle `defaultEnv`; формат `{stand-base}_{suffix}`) |
| `baseUrl` | `""` | HTTP(S) корень приложения |
| `basePath` | `""` | Локальная директория (file://) |
| `browser` | `chrome` | Браузер Selenide |
| `browserVersion` | `148` | Версия (remote) |
| `browserSize` | `1920x1280` | Размер окна |
| `headless` | `false` | Headless mode |
| `closeBrowserAfterEach` | `false` | Закрывать driver после теста |
| `remoteUrl` | `""` | Selenoid / Grid hub |
| `enableVnc`, `enableVideo`, `enableHar` | `false` | Selenoid capabilities (`enableVideo` — запись mp4 на hub) |
| `videoFolder` | `""` | Prefix URL для video attachment |
| `attachVideo` | `false` | Attachment в Allure; работает вместе с `enableVideo` |
| `allureReportMode` | `allure3` | `none` / `allure2` / `allure3` — слой Allure Report (см. `e2e-config-keys`) |
| `logToConsole` | `true` | Мастер stdout |
| `selenideLogToConsole` | `true` | Selenide SimpleReport |
| `rootLogLevel` | `info` | SLF4J simple default level |
| `enableAllureSelenideListener` | `false` | Auto-steps из Selenide в Allure |
| `attachBrowserConsoleLogs`, `attachPageSource`, `attachLastScreenshot`, `attachHarLogs`, `attachVideo` | `false` | Артефакты в `@AfterEach` |

**TestOps** (`ALLURE_ENDPOINT`, `ALLURE_TOKEN`, …) — env CI/runner и `allurectl`; в Java-тесты и `-D` не попадает; autotests-builder генерирует shell-блок `export ALLURE_*`.

Override: `-Dkey=value` или `-Denv=selenoid_local_e2e`.

## Паттерны (RAG)

Индекс: [`docs/rag/README.md`](../rag/README.md). Чанки: `docs/rag/testing/<id>.md`.

| id | chunk |
|----|-------|
| `e2e-layers` | слои stack-agnostic |
| `e2e-config-keys` | таблица ключей (дубль § выше для retrieval) |
| `cfg-env-profile` | выбор env profile |
| `cfg-base-url` | resolve baseUrl / basePath |
| `base-lifecycle` | TestBase setup/teardown |
| `po-locators` | data-testid в PO |
| `po-fluent` | fluent chain |
| `po-step` | @Step в PO |
| `test-style-ladder` | учебная градация LoginTests |
| `test-taxonomy` | @Epic / @Tag |
| `test-negative` | negative validation |
| `test-storage-shortcut` | localStorage auth |
| `allure-attach` | opt-in artifacts |
| `allure-selenide-listener` | AllureSelenide global + per-test override |
| `remote-selenoid` | remote hub |
| `visual-baseline` | visual baselines (header, login, logged-in) |
| `test-pyramid` | testing pyramid — канон `tests-java/` |
| `test-manual` | exploratory vs TestOps `@Manual` |
| `test-logout-flow` | logout patterns (RAG) |

## Split: канон vs учебная ladder (ethalon + RAG)

| | `tests-java/` (канон) | `_ethalon/ladder/` + RAG |
|---|----------------------|--------------------------|
| Назначение | CI, bootstrap, pyramid | учебные паттерны для autotests-builder |
| `LoginTests` | 1 smoke PO + `@Manual` exploratory | full style ladder + negative — `src/test/java/_ethalon/ladder/LoginTests.java` |
| `LogoutTests` | — | form + localStorage fluent — `src/test/java/_ethalon/ladder/LogoutTests.java` |
| Manual | `@Manual` на методе в `LoginTests` exploratory | `shortLoginAuthorizationTest` TestOps — ethalon + чанк `test-manual` |
| Gradle | `testE2e`, `./gradlew test` | `testLadderEthalon` only; `@Tag("ladder-ethalon")` excluded elsewhere; `@Tag("api")` → `testApi` only |

## Учебная градация в `LoginTests` (ethalon)

Код: `tests-java/src/test/java/_ethalon/ladder/LoginTests.java`. Smoke-метод дублируется в каноне `tests/LoginTests.java`.

| Тест | Стиль | Зачем |
|------|-------|-------|
| `shouldLoginWithValidCredentials` | Page Object | Канон smoke: fluent PO + assert |
| `wrongPasswordAuthorizationTest` | Raw inline `$()` | `stepsLocation=none`, listener global off |
| `emptyPasswordAuthorizationTest` | Inline + nested `Allure.step` | `test_allure_step`, `block_nested` |
| `emptyLoginAuthorizationTest` | Inline + `@EnableAllureSelenideListener` | `selenide_listener`, per-test ON, без ручных step |
| `emptyLoginAndPasswordAuthorizationTest` | Raw inline + `@EnableAllureSelenideListener(false)` | per-test listener OFF (явный override) |
| `shortLoginAuthorizationTest` | TestOps manual, только `Allure.step` | `@Manual`, `@AllureId`, без браузера |
| Закомментированный `successfulAuthorizationTest` | Raw Selenide | «До PO» — baseline для сравнения |

В **production** consumer-репо новые тесты — через PO; один источник шагов (PO `@Step` **или** listener **или** `Allure.step` в тесте). Смешение стилей в одном классе — только в учебных примерах RAG (`test-style-ladder`), не в каноне.

## Что не переносим как канон

- `harLogs()` — stub; включать `attachHarLogs` нельзя до реализации.
- Header visual baselines — не в scope 4a; общий паттерн — чанк `visual-baseline` (header + login + logged-in).

## Последствия

- Consumer bootstrap (`bootstrap-test-repo` skill) копирует структуру из `tests-java/README.md` + чанки `docs/rag/`.
- Header e2e — ADR `003-header-smoke-e2e.md` (layout probes + behavioral smoke).
- Visual baselines — cross-epic: `helpers/ScreenshotBaseline.java`, `@Tag("visual")`, флаг `updateBaselines`; чанк `visual-baseline`.
- Pyramid layer review + CI slice tasks — ADR `005-testing-pyramid-review.md`.
- `project-map.mdc` / `skills-map.md`: фазы 4a ✓, 4.pyramid ✓, 4b — по ADR 003.
