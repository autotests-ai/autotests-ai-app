---
id: ci-workflow-ethalon
domain: e2e
phase: 4a
adr: 002
tags: [config, ci, github-actions, workflow, ethalon]
---
# CI workflow ethalon

SSOT GitHub Actions в `tests-java/.github/_ethalon/`.  
Inbox: `_new.yml`, `_modified.yml`. Skill: `sync-github-workflows-ethalon`.

Папка `_ethalon/` — workflow **не исполняется** GHA. Bootstrap копирует в consumer `.github/workflows/` **под тем же именем**, что в ethalon (`{env_base}.yml` / `{env_base}-orchestrator.yml`).

## Именование (= env_base из config)

| Ethalon | Роль | Default `-Denv=` |
|---------|------|------------------|
| `{env_base}.yml` | App browser e2e (один Java job) | `{env_base}_e2e` |
| `{env_base}-orchestrator.yml` | Multi-source: Go matrix + Java + merge Allure + `repository_dispatch` | `{env_base}_e2e` |

Visual slice — через input `env_profile={env_base}_visual`, не отдельный ethalon-файл.

### Эталоны в template-project

| Ethalon | Stand | Consumer reference |
|---------|-------|-------------------|
| `selenoid-autotests-cloud_github.yml` | app e2e на Pages + cloud hub | tms-automator, one-page-form |
| `selenoid_github-orchestrator.yml` | hub stack (Go + Java) | selenoid-home/tests-java |

Имя runnable-файла = имя ethalon. Не использовать короткие repo-specific имена (`workflow.yml` и т.п.).

## Два слоя CI

| Слой | Файл | Что задаёт |
|------|------|------------|
| **Properties** | `config/{stand-base}_{deployment}_{layer}.properties` | baseUrl, remoteUrl, attach*, allureReportMode |
| **Workflow** | `_ethalon/{stand-base}_{deployment}.yml` или `{stand-base}-orchestrator.yml` | triggers, TestOps, Pages, `GRADLE_ARGS` overrides |

Merge: `-Dkey=value` в workflow **перекрывает** properties.

**Gradle:** везде `./gradlew` из `tests-java/` (wrapper 9.6.0). CI: `setup-gradle` + `gradle-version: wrapper`.

## App — `selenoid-autotests-cloud_github.yml`

### GRADLE_ARGS (минимум)

```bash
GRADLE_ARGS=(
  -Denv="${ENV_PROFILE}"                    # default: selenoid-autotests-cloud_github_e2e
  -DbrowserVersion="${BROWSER_VERSION}"
  -Djunit.jupiter.execution.parallel.config.fixed.parallelism=3
  -DincludeTags=smoke -DexcludeTags=visual  # или visual slice
)
```

Не дублировать ключи из `selenoid-autotests-cloud_github_e2e.properties`.

### workflow_dispatch inputs

| Input | Default | Назначение |
|-------|---------|------------|
| `env_profile` | `selenoid-autotests-cloud_github_e2e` | `-Denv=` |
| `include_tags` | *(empty → slice default)* | override tags |
| `exclude_tags` | *(empty)* | override tags |
| `test_class` | *(empty)* | `--tests` single method |
| `test_case_id` | *(empty)* | TestOps launch name |

## Orchestrator — `selenoid_github-orchestrator.yml`

Jobs: `go-unit` (matrix) → `java-e2e` → `report` (merge artifacts, Allure 3, TestOps, Pages).

### Java GRADLE_ARGS (минимум)

```bash
GRADLE_ARGS=(
  -Denv="${ENV_PROFILE}"       # default: selenoid_github_e2e
  -DskipHealthCheck=true
  -DincludeTags=smoke,api
  -DexcludeTags=resilience,local-only,playwright
)
```

Не дублировать: `allureReportMode`, `logToConsole`, `remoteUrl`, `hubUrl` — уже в env profile / `default.properties`.

Go scripts (`scripts/run-go-unit.sh`) — **consumer bootstrap** (selenoid-home), не копировать в template-project без ADR.

### Cross-repo trigger (`repository_dispatch`)

Service repo после deploy → `repository_dispatch` type `deploy-smoke` → tests repo (orchestrator).

| Payload field | Назначение |
|---------------|------------|
| `source_repo` | имя/URL triggering repo → `executor.json`, TestOps launch name |
| `source_version` | deployed version/tag |
| `test_tags` | optional override JUnit tags |

## Secrets / vars (consumer)

| Name | Kind | Назначение |
|------|------|------------|
| `ALLURE_TOKEN` | secret | TestOps upload |
| `ALLURE_PROJECT_ID` | var | opt-in allurectl |
| `ALLURE_ENDPOINT` | var | default `https://allure.qa.guru` |

## Shared report steps (app + orchestrator)

1. Load/restore Allure history (`gh-pages` / `history.jsonl`)
2. allurectl (if `ALLURE_PROJECT_ID`)
3. **`./gradlew allureQualityGate`** — после `test` / merge artifacts, до отчёта; rules в `allurerc.json`; RAG `alr-quality-gate`
4. `executor.json` + `./gradlew allureReport`
5. peaceiris/actions-gh-pages
6. allurectl upload (+ close launch для app ethalon)
7. Job summary — fail при `TEST_EXIT≠0` или `QUALITY_GATE_EXIT≠0` (app); orchestrator `report` job — отдельный fail step для gate

Orchestrator delta: download-artifact merge (`allure-go-*` + `allure-java`).

## Consumer sources (read-only)

| Pipeline | Ethalon | Path in qa-guru-home |
|----------|---------|----------------------|
| App e2e | `selenoid-autotests-cloud_github.yml` | `…/templates/tests-java/.github/workflows/selenoid-autotests-cloud_github.yml` |
| App e2e | | `…/one-page-form-tests-java/.github/workflows/selenoid-autotests-cloud_github.yml` |
| Hub orchestrator | `selenoid_github-orchestrator.yml` | `selenoid-home/tests-java/.github/workflows/selenoid_github-orchestrator.yml` |

Migrate consumer: `-Denv=ci` → `{stand-base}_{deployment}_{layer}`; см. skill `sync-github-workflows-ethalon` § C.

## Don't

- `-Denv=ci`, `ci.properties`
- Hardcoded `ALLURE_PROJECT_ID` в ethalon
- Имена workflow-файлов, отличные от ethalon (`{env_base}.yml`)
- Копировать `.github/scripts/*` из consumer в template-project без ADR
- Дублировать attach/remote keys в GRADLE_ARGS, если они в env profile
