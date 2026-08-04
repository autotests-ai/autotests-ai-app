# ADR 005: Testing pyramid — ревью каноничности

**Статус:** принято  
**Дата:** 2026-07-01

## Контекст

Фаза **4.pyramid** закрыта: `@Layer` unit / component / integration / api / e2e / manual + CI slices (`testVisual`, `testManual`, …) в `tests-java/`. Перед bootstrap и CI-slices нужна явная фиксация: подход оптимален для template-project и не требует структурных изменений.

См. ADR 002 (stack), ADR 004 (api layer), чанк `test-pyramid`.

## Ревью `@Layer` (ярусов)

| `@Layer` | Каноничность | Комментарий |
|----------|:------------:|-------------|
| **unit** | ✓ | Чистый Java; фильтр через glob — единственная асимметрия |
| **component** | ✓ | Один каталог `tests/component/`, `@Tag("component")` на классе |
| **integration** | ✓ | `layout` + `mount` — два подтипа, осмысленно |
| **api** | ✓ | Отдельный `ApiTestBase`, ADR 004, auto skip health check |
| **e2e** | ✓ | Smoke в каноне; `*BaselineTests` — тот же `@Layer("e2e")`; ladder — ethalon `_ethalon/ladder/` + RAG `test-style-ladder` |
| **manual** | ✓ | `@Layer("manual")` на **методе** exploratory в `LoginTests`, не отдельный пакет |

**Visual — не `@Layer`:** `@Layer("e2e")` + `@Tag("visual")` + env `*_visual` + `testVisual` (CI slice). См. RAG `visual-baseline`.

**Вывод:** для template-project / bootstrap эталона подход оптимален и каноничен.

## Решение

### 1. Структуру `@Layer` не менять

- Unit без `@Tag("unit")` на каждом классе — фильтр `--tests 'helpers.*Test' config.*Test'` (или `./gradlew testUnit`).
- **Visual — CI slice, не `@Layer`:** классы `*BaselineTests` — `@Layer("e2e")`; отбор — `@Tag("visual")` + env `*_visual` + `testVisual`.
- **Manual — `@Layer` на методе:** `@Layer("manual")` + `@Manual` на exploratory-методе; slice — `@Tag("manual")` + `*_manual` + `testManual`.
- Полный `./gradlew test` ≠ CI-slices: default env `local_e2e`; исключены `ladder-ethalon` и `api` (api — slice `testApi` / hub). CI и release verification — slice tasks / `-DincludeTags`.

### 2. Convenience tasks в `build.gradle`

Именованные задачи дублируют release verification slices из `tests-java/README.md`:

| Task | Default env | Фильтр |
|------|-------------|--------|
| `testUnit` | `{stand}_unit` (default `local_unit`) | glob; auto skip health check |
| `testComponent` | `{stand}_component` | `@Tag("component")` |
| `testIntegration` | `{stand}_integration` | `@Tag("layout")`, `@Tag("mount")` |
| `testApi` | `{stand}_api` | `@Tag("api")`; auto skip health check |
| `testE2e` | `{stand}_e2e` | `@Tag("smoke")`, exclude `visual` |
| `testVisual` | `{stand}_visual` | `@Tag("visual")` |
| `testManual` | `{stand}_manual` | `@Tag("manual")` |

Env override: `-Denv=selenoid_local` (stand prefix) or `-Denv=selenoid_local_api` → `selenoid_local_api.properties`.

### 3. Auto `healthCheck` skip

`healthCheck` no-op, если:

- `-DskipHealthCheck=true`;
- `-Denv` оканчивается на `_unit` или `_api`;
- `-DincludeTags=api` (только api).

Pyramid tasks выставляют env для health check через `gradle.taskGraph.whenReady`.

### 4. Вне scope этого ADR

- Массовое `@Tag("unit")` на unit-классах — опционально, отдельный чат; glob остаётся каноном.
- Учебная ladder в `tests-java/` — по-прежнему запрещена; паттерны — ethalon `_ethalon/ladder/` (`test-style-ladder`).

## Эксплуатация (главное)

1. **Не путать** `./gradlew test` (full suite, health check, default `local_e2e`) с **CI-slices** (`testE2e`, `-DincludeTags=smoke`, …).
2. **Не путать `@Layer` и slice:** visual — slice (`@Tag("visual")` + `*_visual` + `testVisual`), не ярус; manual — `@Layer` на методе + slice `testManual`.
3. **api / unit** — health check auto-skip (`*_unit`, `*_api`, `-DincludeTags=api`) или slice tasks `testApi` / `testUnit`.

## RAG

- `test-pyramid` — таблица ярусов + convenience tasks
- `ci-gradle-args` — CI vs properties vs Gradle-only keys
- `test-api-layer` — api slice

## Последствия

- Bootstrap (`bootstrap-test-repo`) копирует slice tasks в consumer `build.gradle`.
- Release verification в README — ссылка на ADR 005 и именованные tasks.
