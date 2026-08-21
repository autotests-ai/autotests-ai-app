---
id: test-components
domain: testing
phase: 4.pyramid
tags: [component, testops, allure, selenoid]
related: [test-layers, test-pyramid]
---
# Component — код ↔ Allure TestOps

**id:** `test-components`

Единый SSOT для `@Component` в Java и custom field **Component** в Allure TestOps (проект Selenoid Tests).

## Ключ в коде → Component (TestOps)

| `@Component` | Сервис / repo |
|--------------|---------------|
| `cm` | qa-guru/cm |
| `selenoid` | qa-guru/selenoid |
| `selenoid-ui` | qa-guru/selenoid-ui |
| `playwright-image` | qa-guru/playwright-image |

**Не путать** с Test Layer `component` → **Component Tests** (`@Layer("component")`).

## TestOps project setup

1. **Project → Custom fields:** поле **Component** (single/multi select).
2. **Project → Settings → Custom field schema:** Key `component` → field **Component**.
3. **Project → Settings → Upload:** `custom_field` policy = `from_test_result`.

Sync script (automator):

```bash
cd qa-guru-tms-automator
python scripts/sync_testops_component_mappings.py --project-id 5271
python scripts/sync_testops_component_mappings.py --list-components
```

API: `POST /api/cfschema` (key + customFieldId), `POST /api/cfv` (values), `POST /api/testcaseupdateschema` (field `custom_field`).

## Allure label

`annotations/Component.java` → `@LabelAnnotation(name = "component")`.  
Go unit (JUnit→Allure): `scripts/junit-to-allure.mjs --component` (default = `--epic`).

## Do

- Новый автотест сервиса: `@Component("…")` по таблице; `@Epic` — тот же ключ (lowercase).
- CM: `@Component("cm")`, `@Epic("cm")` — не `CM`.

## Don't

- Display names repo в Java (`CM`, `Selenoid UI`).
- Путать `@Component` (сервис) и `@Layer("component")` (пирамида).
