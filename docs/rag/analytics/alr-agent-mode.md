---
id: alr-agent-mode
domain: analytics
phase: 7.analytics
adr: 002
tags: [allure, agent, inspect, analytics]
---
# Allure Agent Mode (inspect + query)

**id:** `alr-agent-mode`

## Файлы

`tests-java/build.gradle` (`allureAgentInspect`, `allureAgentQuery`), `TestConfig.allureAgentMode()`, `allurerc.json`, RAG `e2e-config-keys.md` → `allureAgentMode`.

## Входы

- `build/allure-results/` после прогона (`allureReportMode≠none`)
- `allurerc.json` — тот же config, что для `./gradlew allureReport` / quality gate

## Выходы (`build/agent-output/`)

| Artifact | Назначение |
|----------|------------|
| `index.md` | Run summary, environments, findings — human/agent-readable |
| `AGENTS.md` | Инструкции для агента по чтению output |
| `manifest/` | JSON manifest (schema `allure-agent-output/v1`) |
| `tests/` | Per-test markdown |
| `awesome/` | Plugin-derived slices |

## Gradle hook

`-DallureAgentMode=inspect` → post-`test` / pyramid slice:

1. `allureAgentInspect` — `npx allure@<version> agent inspect build/allure-results --output build/agent-output --config allurerc.json`
2. `allureAgentQuery` — `npx allure agent query --from build/agent-output summary` (JSON smoke)

Default: `allureAgentMode=none` (hook off).

## Smoke (фаза 7.analytics)

Prerequisite: HTTP server из `frontend/` на `:3000`.

```bash
cd tests-java
rm -rf build/allure-results build/agent-output   # чистый прогон — иначе inspect видит накопленные results
./gradlew test -Denv=local_e2e -DallureAgentMode=inspect \
  --tests 'tests.LoginTests' \
  -Dheadless=true -DcloseBrowserAfterEach=false
```

Assert:

- `build/agent-output/index.md` существует, phase `done`
- `./gradlew allureAgentQuery` → exit `0`, stdout JSON `schema: allure-agent-query/v1`, `view: summary`
- Фильтр failed: `npx --yes allure@3.13.0 agent query --from build/agent-output tests --status failed`

Ручной query (без Gradle):

```bash
npx --yes allure@3.13.0 agent query --from build/agent-output summary
npx --yes allure@3.13.0 agent query --from build/agent-output tests --status failed
npx --yes allure@3.13.0 agent query --from build/agent-output findings --severity high
npx --yes allure@3.13.0 agent query --latest summary   # последний output для cwd
```

## Agent vs raw JSON

| Подход | Когда |
|--------|-------|
| `allure agent inspect` + `query` | Агент/skill разбирает прогон: summary, failed tests, findings; не парсить `*-result.json` вручную |
| Raw `build/allure-results/*.json` | Низкоуровневый debug, attachment paths, custom tooling |
| `./gradlew allureReport` | Human HTML dashboard; не заменяет agent manifest |
| `./gradlew allureQualityGate` | Pass/fail verdict по rules; ортогонально agent mode |

## Do

- Локально: `-DallureAgentMode=inspect` на целевой slice (`--tests 'tests.LoginTests'` или `testE2e`)
- Перед smoke — очистить `build/allure-results` (или `cleanTest`), иначе `index.md` агрегирует старые runs
- Читать `index.md` / `AGENTS.md` для обзора; `agent query` — для структурированного JSON
- CLI pin: `npx --yes allure@<allureVersion>` — версия = `allureVersion` в `build.gradle`

## Don't

- `allureReportMode=none` + `allureAgentMode=inspect` — нет results для inspect
- Не путать с TestOps / Cursor Agent SDK — это Allure Report 3 CLI `agent` subcommand
- Не коммитить `build/agent-output/` (генерируется post-test)
- Skill `allure-agent-inspect` — **active** (`.cursor/skills/allure-agent-inspect/`); этот чанк — Gradle hook + smoke + query API
