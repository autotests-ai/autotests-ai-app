---
id: visual-baseline
domain: testing
phase: 4.visual
adr: 002, 003
tags: [visual, baseline]
---
# Visual baselines (cross-epic)

**id:** `visual-baseline`

Общая инфраструктура pixel diff для **всех** `@Tag("visual")` тестов. Не только header.

## Файлы

| Файл | Назначение |
|------|------------|
| `helpers/ScreenshotBaseline.java` | capture + compare + write baseline |
| `config/TestConfig.java` | `updateBaselines`, `baselinesDir`, `visualDiffThreshold` |
| `tests/LoginBaselineTests.java` | `@Epic("One Page Form")` — форма login |
| `tests/LoggedInBaselineTests.java` | `@Epic("One Page Form")` — welcome после auth |
| `src/test/resources/screenshots/{area}/` | baseline PNG (`login`, `logged-in`) |

Header-специфика (селекторы, viewports harness) — чанк `hdr-visual-opt`.

## Входы

- `-DupdateBaselines=true` — перезаписать baselines вместо compare (локально / отдельный job)
- `-DvisualDiffThreshold=0.02` — tuning pixel diff без перекомпиляции
- `baselinesDir` — подкаталог `src/test/resources/` (default `screenshots`)
- env profile (`local_e2e`, `local_visual`, …) — тот же stand, другой **CI slice** (не `@Layer`)
- viewport: **390**, **768**, **1280** (`layout-standard.md`)

## Assert

pixel diff ratio ≤ `visualDiffThreshold` (default `0.015`); размер PNG не меняется. CI: compare-only — без baseline PNG тест **FAIL** (не auto-record).

## Allure attachments (`{area}-{viewport}`)

Имена из `*BaselineTests` (`login-390`, `logged-in-768`, …). `TestBase` «Last screenshot» — отдельно, full page.

Вложения группируются под родительским step в helper: `Compare screenshot: {area}-{viewport}` (или `Update baseline:` / `Record baseline:`).

| Режим | Вложения |
|-------|----------|
| compare OK | `{area}-{viewport}` |
| compare FAIL | `-baseline`, `-actual`, `-diff` (diff — подсветка пикселей) |
| `-DupdateBaselines=true`, baseline есть | `-baseline-old`, `-baseline-new` |
| `-DupdateBaselines=true`, baseline нет | `-baseline-new` |
| compare, baseline нет | FAIL + `-actual-unmatched` |

## Do

- Отдельный test-класс на visual (`*BaselineTests`), не смешивать с `@Tag("smoke")` / `@Tag("layout")`; на классе `@Layer("e2e")`, slice — `@Tag("visual")` + `testVisual` / `*_visual` (чанк `test-pyramid`)
- Один `@Test` — один screenshot assert (не layout probe + screenshot)
- Baselines: `screenshots/login/`, `screenshots/logged-in/`
- logged-in visual через submit-flow (`LoginPage.fillAndSubmitForm`); localStorage shortcut — `test-storage-shortcut`
- Запуск suite: `./gradlew test -DincludeTags=visual` (`@Tag("visual")`); перезапись — `-DupdateBaselines=true`
- Allure Suites: class-level `@Suite` + `@SubSuite("visual")` → `Login > visual`, `Logged-in > visual`

## Don't

- Отдельный флаг на epic (`updateHeaderBaselines`, `updateLoginBaselines`)
- Legacy `updateNavBaselines` / `NavScreenshot` — не копировать в канон
- Screenshot в том же `@Test`, что behavioral smoke или layout probe
- Baselines в PR smoke/layout (4a, 4b)
- `attachLastScreenshot=true` в рутинных visual-прогонах — redundant с element crop из `ScreenshotBaseline`; full page только для opt-in отладки
