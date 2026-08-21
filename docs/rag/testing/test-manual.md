---
id: test-manual
domain: testing
phase: 4.pyramid
adr: 002
tags: [allure, manual, testops]
---
# Manual tests

**id:** `test-manual`

Два паттерна `@Manual` — разные цели, разные пути.

## Файлы

| Паттерн | Путь | Зачем |
|---------|------|-------|
| Exploratory (пирамида) | `tests-java/src/test/java/tests/LoginTests` — методы с `@Manual` | Чеклист для ручного прогона в Allure; `@Layer("manual")` и `@Tag("manual")` на **методе**, класс остаётся `@Layer("e2e")` |
| TestOps import (ethalon) | `_ethalon/ladder/LoginTests.shortLoginAuthorizationTest` | `@AllureId`, только `Allure.step`, **без Selenide** — синх с TestOps |

Аннотация: `annotations/Manual.java` → label `ALLURE_MANUAL=true`.

## Входы

Exploratory: сценарий в `@DisplayName`, шаги — текст без автomation.  
TestOps: `@AllureId("…")`, `@Severity`, `stepsNesting=scenario_only`.

## Assert

Exploratory: человек отмечает pass/fail в TestOps.  
TestOps manual (RAG): шаги видны в отчёте без browser steps.

## Do

- Exploratory — `@Manual` на методе в `LoginTests`, не отдельный пакет `tests/manual/`.
- TestOps manual — только ethalon (`_ethalon/ladder/`); не переносить `shortLoginAuthorizationTest` в `tests-java/LoginTests`.
- Gradle manual layer: `-DincludeTags=manual`.

## Don't

- Путать exploratory stub и автоматизированный negative test.
- Запускать `@Manual` в nightly smoke (`-DincludeTags=smoke`).
