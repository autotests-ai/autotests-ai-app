---
id: test-pyramid
domain: testing
phase: 4.pyramid
adr: 002
tags: [structure, junit, layer, pyramid]
related: [005-pyramid-gradle-tasks]
---
# Testing pyramid (канон)

**id:** `test-pyramid`

`@Layer` (ярус пирамиды) и **CI slice / env profile** — разные оси. Канон для bootstrap и CI — **`tests-java/`**. Роль теста: `@Layer` + `@Tag` + `@Epic`. Имена классов **без** Smoke / Visual / Mount в названии.

## `@Layer` (ярусы)

Шесть ключей `@Layer` — см. чанк **`test-layers`**. **Visual не входит:** классы `*BaselineTests` остаются `@Layer("e2e")`.

| `@Layer` | Путь / классы | Target |
|----------|---------------|--------|
| unit | `helpers/*Test`, `config/*Test` | pure Java |
| component | `tests/component/*Tests` (`LangToggleTests`, `PrimitiveSizeTests`) | `/components.html` |
| integration | `LoginFormTests`, `LoginEmbedTests` | `/login.html` mount + embed |
| api | `tests/api/*Tests` | Rest Assured HTTP (`hubUrl` / `apiBaseUrl`) |
| e2e | `LoginTests`, `LoginBaselineTests`, `LoggedInBaselineTests` | login flow; pixel diff — только при slice `visual` |
| manual | `@Layer("manual")` + `@Manual` на **методе** в `LoginTests` | exploratory stubs (`@Tag("manual")` на методе) |

Login: `LoginFormTests` + `LoginEmbedTests` (integration) → `LoginTests` (e2e smoke) → `LoginBaselineTests` / `LoggedInBaselineTests` (**visual slice**, `@Layer("e2e")`).  
Header: `LangToggleTests` (component) + `LoginEmbedTests` (integration embed); harness `/header.html` — не target автотестов.

## CI slice / env profile (не `@Layer`)

Отдельные оси прогона: `@Tag` + `-Denv={stand}_{suffix}` + convenience task. Суффикс в имени properties — **не** новый `@Layer`.

| Slice | Класс `@Layer` | `@Tag` | Env | Task |
|-------|----------------|--------|-----|------|
| smoke e2e | `e2e` | `smoke`, exclude `visual` | `*_e2e` | `testE2e` |
| visual | `e2e` | `visual` | `*_visual` | `testVisual` |
| manual | `manual` (метод) | `manual` | `*_manual` | `testManual` |

Visual = `@Layer("e2e")` + `@Tag("visual")` + `local_visual` / `testVisual` — **slice**, не ярус.

Учебная ladder-градация стилей — ethalon **`tests-java/src/test/java/_ethalon/ladder/`**, чанк **`test-style-ladder`**. Не смешивать с каноном.

## Gradle

**Full suite** (`./gradlew test`) ≠ **CI slices** — default env `local_e2e`; исключены `@Tag("ladder-ethalon")` и `@Tag("api")` (api — только `testApi` / hub). Slices: convenience tasks (ADR 005) или эквивалентные `-D`.

| Task | Эквивалент |
|------|------------|
| `testUnit` | `--tests 'helpers.*Test' config.*Test` + `-Denv=local_unit` (auto skip health check) |
| `testComponent` | `-Denv=local_component -DincludeTags=component` |
| `testIntegration` | `-Denv=local_integration -DincludeTags=layout,mount` |
| `testApi` | `-Denv=selenoid_local_api` (or stand prefix `-Denv=selenoid_local`) |
| `testE2e` | `-Denv=local_e2e -DincludeTags=smoke -DexcludeTags=visual` |
| `testVisual` | `-Denv=local_visual -DincludeTags=visual` |
| `testManual` | `-Denv=local_manual -DincludeTags=manual` |

```bash
./gradlew testUnit
./gradlew testE2e
./gradlew testApi -Denv=selenoid_local   # selenoid_local_api.properties
./gradlew testVisual -DupdateBaselines=true
./gradlew testE2e -Denv=one-page-form_prod   # → one-page-form_prod_e2e.properties
```

TestOps mapping (`e2e` → E2E Tests, не UI Tests) — чанк **`test-layers`**. Visual в TestOps остаётся **E2E Tests** (`@Layer("e2e")` на классе).

## Do

- Новый сценарий: выбрать ярус → один класс на concern (`LoginTests` = smoke + `@Manual` exploratory).
- Stack-слои (`config/`, `pages/`, `TestBase`, `api/`) — чанки `e2e-layers`, `test-api-layer`.

## Don't

- Возвращать учебную ladder (negative inline, listener demo) в `tests-java/LoginTests`.
- Смешивать `@Tag("smoke")` и `@Tag("visual")` в одном `@Test`.
- Дублировать logout ladder в каноне — см. `test-logout-flow` (RAG).
- Открывать в автотестах harness `/header.html` — только playground; header в каноне: component + embed на login.
