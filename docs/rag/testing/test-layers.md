---
id: test-layers
domain: testing
phase: 4.pyramid
adr: 002
tags: [layer, pyramid, testops, allure]
related: [test-pyramid]
---
# Test layers — код ↔ Allure TestOps

**id:** `test-layers`

Единый SSOT для `@Layer` в Java и Test Layer в Allure TestOps.

## Ключ в коде → Test Layer (TestOps)

| Key (`@Layer`) | Test Layer (admin) | Gradle slice |
|----------------|-------------------|--------------|
| `unit` | Unit Tests | `testUnit` |
| `component` | Component Tests | `testComponent` |
| `integration` | Integration Tests | `testIntegration` |
| `api` | API Tests | `testApi` |
| `e2e` | **E2E Tests** | `testE2e` |
| `manual` | Manual Tests | `testManual` |

**Deprecated:** `UI Tests` (Allure default) — не назначать кейсам. Browser smoke → `e2e` / **E2E Tests**.

**Не `@Layer`:** visual — `@Layer("e2e")` на классе + `@Tag("visual")` + env `*_visual` + `testVisual` (CI slice). Ключ `visual` не добавлять в таблицу `@Layer` и не в `testingPyramid.layers`.

## TestOps project setup

1. **Admin** (`/admin/testlayer`): six layers above must exist (E2E / Component / Integration / Manual — custom).
2. **Project → Settings → Test layers:** Key → Test Layer mapping (same keys as `@Layer`).
3. **Project → Settings → Upload:** `test_layer` policy = `from_test_result`.

Sync script (automator):

```bash
cd qa-guru-tms-automator
python scripts/sync_testops_layer_mappings.py --project-id 5271,5267,5263
python scripts/sync_testops_layer_mappings.py --list-mapping
```

Manual case creation (`create_manual_testcase.py`, skill `give-manual-testcase`): default `--layer manual` → **Manual Tests**; auto-runs layer sync if project mappings incomplete.

API: `POST /api/testlayerschema` (key + testLayerId), `POST /api/testcaseupdateschema` (field `test_layer`).

## Allure label

`annotations/Layer.java` → `@LabelAnnotation(name = "layer")`. Upload via `allurectl upload`; mapping resolves key → Test Layer.

## Dashboard (Allure 3 local)

`allurerc.json` / `allurerc.mjs` → `name`: **название отчёта/launch** = `{github-repo-slug} Tests` (напр. `template-project Tests`, `one-page-form-tests-java Tests`, `selenoid-tests Tests`) — **не** Test Layer и **не** `@Layer`.  
`plugins.dashboard.options.reportName` → `{slug} Tests Dashboard`; `plugins.csv.options.fileName` → `{slug}.csv`.  
`testingPyramid.layers`: ключи `@Layer` (`unit`, `component`, `integration`, `api`, `e2e`, `manual`).

## GitHub Actions (consumer workflow)

Runnable-файл в consumer = имя ethalon (`selenoid-qa-guru_github.yml`). Top-level `name:` = **`{github-repo-slug} Tests`** — как `allurerc.name`; на TestOps не влияет.

| Repo (GitHub slug) | `allurerc.name` | workflow `name:` |
|--------------------|-----------------|------------------|
| `template-project` | template-project Tests | template-project Tests |
| `qa_guru_automator_ethalon-5267` | qa_guru_automator_ethalon-5267 Tests | qa_guru_automator_ethalon-5267 Tests |
| `one-page-form-tests-java` | one-page-form-tests-java Tests | one-page-form-tests-java Tests |
| `selenoid-tests` | selenoid-tests Tests | selenoid-tests Tests |

Не путать с `allurerc.name` (отчёт) и Test Layer (`e2e` → **E2E Tests** в TestOps).

Сервисный фильтр **Component** (cm / selenoid / …) — отдельно: RAG `test-components`, `@Component`, sync `sync_testops_component_mappings.py`.

## Do

- Новый автотест: `@Layer` по таблице (без `visual`); `@Tag` для CI slice (`smoke`, `api`, `visual`, `manual`).
- Ручной кейс TestOps: Test Layer = E2E Tests / Manual Tests / … по сценарию (не UI Tests).
- Автоматизация manual → `@Layer("e2e")` (skill `automate-manual-test`).

## Don't

- `@Layer("UI Tests")` или display names TestOps в Java.
- Два верхних слоя на один smoke (`UI Tests` + `E2E Tests`).
- Менять ключи в коде под TestOps — менять mapping в TestOps.
