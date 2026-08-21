---
id: ci-gradle-args
domain: config
phase: 4a
adr: 002
tags: [config, ci, github-actions, gradle, properties]
---
# CI: properties vs workflow `-D`

Карта слоя **CI override**: `config/{stand-base}_{deployment}_{layer}.properties` + `GRADLE_ARGS` в `.github/workflows/*.yml`.  
Merge: `-Dkey=value` (system properties) **перекрывает** значение из properties-файла.

**SSOT контракта ключей:** `TestConfig.java`, `e2e-config-keys.md`, `_ethalon.properties`.  
**SSOT workflow:** `tests-java/.github/_ethalon/` — `{stand}.yml` / `{stand}-orchestrator.yml`; см. `ci-workflow-ethalon.md`, skill `sync-github-workflows-ethalon`.

## Именование ethalon

| Ethalon | Stand | Default `-Denv=` |
|---------|-------|------------------|
| `selenoid-qa-guru_github.yml` | app e2e | `selenoid-qa-guru_github_e2e` |
| `selenoid_github-orchestrator.yml` | hub stack | `selenoid_github_e2e` |

## Именование env-профилей

Формат: **`{stand-base}_{deployment}_{suffix}.properties`** (без deployment: `{stand-base}_{suffix}`). Суффикс = `@Layer` или CI slice (`visual`). Stand-only и `ci.properties` **не используются**.

| Пример `-Denv=` | Pipeline | Suffix |
|-----------------|----------|--------|
| `selenoid_github_e2e` | selenoid-home GHA | hub smoke |
| `selenoid_github_integration` | selenoid-home GHA | hub integration |
| `selenoid_jenkins_e2e` | selenoid-home Jenkins | hub smoke |
| `selenoid-ui_github_e2e` | selenoid-ui GHA | UI smoke |
| `selenoid-qa-guru_github_e2e` | tms-automator GHA | app e2e + attachments |
| `selenoid-qa-guru_github_visual` | tms-automator nightly | baselines |

Smoke — через `-DincludeTags=smoke`, не через имя suffix (smoke = `e2e` + exclude `visual`).

## App e2e — `selenoid-qa-guru_github.yml`

Ethalon: `tests-java/.github/_ethalon/selenoid-qa-guru_github.yml`  
Profile: `selenoid-qa-guru_github_e2e` (+ tags `-DincludeTags=smoke -DexcludeTags=visual`)

Visual nightly: `env_profile=selenoid-qa-guru_github_visual` (+ auto `includeTags=visual`)

Consumer reference: `qa-guru-home/qa-guru-tms-automator/templates/tests-java/.github/workflows/selenoid-qa-guru_github.yml` (migrate `-Denv=ci`).

## Hub orchestrator — `selenoid_github-orchestrator.yml`

Ethalon: `tests-java/.github/_ethalon/selenoid_github-orchestrator.yml`  
Profile: `selenoid_github_e2e` (migrate consumer from `-Denv=ci`)  
Jenkins variant stand: `selenoid_jenkins_e2e` → future `{stand}-orchestrator.yml` if needed.

Consumer reference: `qa-guru-home/selenoid-home/tests-java/.github/workflows/selenoid_github-orchestrator.yml`.

## Gradle-only keys (не TestConfig)

| Key | Где | Назначение |
|-----|-----|------------|
| `env` | `-Denv=<stand-base>_<layer>` | имя `config/${env}.properties` |
| `includeTags` / `excludeTags` | workflow / CLI | JUnit 5 tags в `build.gradle` |
| `skipHealthCheck` | workflow / CLI | пропуск `healthCheck` task |
| `updateBaselines` | CLI | visual baselines |

## Convenience tasks (ADR 005)

`./gradlew test` = full suite; CI slices — именованные tasks: `testUnit`, `testComponent`, `testIntegration`, `testApi`, `testE2e`, `testVisual`, `testManual`. См. `test-pyramid`, `tests-java/README.md` § Release verification.

## Don't

- Stand-only profiles (`local.properties`, `selenoid_github.properties`) — **не используются**; канон `{stand-base}_{layer}.properties`.
- Общий `ci.properties` для разных pipeline.
- Слой `e2e-smoke` в имени файла — smoke = tag.
- Добавлять `-Dkey` в workflow без `@Key` в `TestConfig` (кроме Gradle-only таблицы выше).
