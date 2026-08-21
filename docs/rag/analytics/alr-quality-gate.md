---
id: alr-quality-gate
domain: analytics
phase: 7.analytics
adr: 002
tags: [allure, quality-gate, ci, analytics]
---
# Allure 3 quality gate

**id:** `alr-quality-gate`

## Файлы

`tests-java/allurerc.json` (`qualityGate`, `knownIssuesPath`), `tests-java/known.json`, Gradle task `allureQualityGate` в `build.gradle`, CI — `docs/rag/config/ci-workflow-ethalon.md`.

## Входы

- `build/allure-results/` после прогона (`allureReportMode≠none`)
- Правила в `allurerc.json` → `qualityGate.rules`
- Known issues: `known.json` (массив `{ "historyId": "…", "issues": […] }`)

## Assert

- `./gradlew allureQualityGate` → exit `0` (gate passed) или `1` (rule failed)
- CI: шаг после `test`, до `allureReport`; job fail при `QUALITY_GATE_EXIT≠0`

## Канон rules (default)

```json
"qualityGate": {
  "rules": [{ "maxFailures": 0 }]
}
```

`maxFailures` не считает тесты из `known.json`. Другие built-in: `minTestsCount`, `successRate`, `maxDuration`, `allTestsContainEnv`, `environmentsTested` — см. [Quality Gate](https://allurereport.org/docs/quality-gate/).

## Do

- Локально: `./gradlew test … && ./gradlew allureQualityGate` или `-DallureQualityGate=true` на `test` / pyramid slice
- CI app ethalon: gate сразу после Java `test`, при наличии results
- CI orchestrator: gate в job `report` после merge Go+Java artifacts, до `allureReport`
- Flaky: добавить `historyId` в `known.json` (из `*-result.json` в `build/allure-results/`)
- CLI pin: `npx --yes allure@<allureVersion>` — версия = `allureVersion` в `build.gradle` (сейчас 3.13.0)

## Don't

- Не путать с TestOps launch quality gate — это локальный Allure Report 3
- `fastFail` работает только с `allure run -- ./gradlew test`, не с обычным Gradle `test`
- Не включать `allure run --rerun` вместе с quality gate в config (несовместимо)
- Не дублировать enforcement только через JUnit exit: gate нужен для `known.json`, `successRate`, `minTestsCount`

## Gradle vs JUnit

При `maxFailures: 0` без known issues gate ≈ JUnit fail. Отдельный шаг в CI даёт явный Allure-native verdict в логе и задел под мягкие правила (`successRate`, known issues).
