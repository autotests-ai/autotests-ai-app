---
id: e2e-layers
domain: testing
phase: 4a
adr: 002
tags: [structure, testbase, pages]
---
# Слои e2e (stack-agnostic)

Структура `tests-java/` — единый эталон для портирования на другие стеки. **Testing pyramid** (`@Layer`: unit / component / integration / api / e2e / manual; CI slice `visual`) — чанк `test-pyramid`.

## Слои

| Слой | Назначение |
|------|------------|
| `config/` | Env profiles, typed keys, merge system props |
| `api/` | Rest Assured base (`ApiTestBase`) — `@Layer("api")` |
| `TestBase` | Driver setup once; teardown artifacts + close driver |
| `pages/` | Page Objects, locators, `@Step` |
| `tests/` | JUnit classes, Allure taxonomy, tags |
| `allure/` | Attachment helpers |
| `annotations/` | Cross-cutting labels (`@Layer`) |

## Do

- Новый сценарий: PO → test class; config не дублировать в тестах.

## Don't

- Setup driver в каждом `@Test`.
- Смешивать header и login в одном epic без ADR.
