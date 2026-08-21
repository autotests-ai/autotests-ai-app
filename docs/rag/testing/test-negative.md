---
id: test-negative
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# Validation errors

**id:** `test-negative`

## Файлы

**Ethalon:** `tests-java/src/test/java/_ethalon/ladder/LoginTests.java` — `wrongPasswordAuthorizationTest`, `emptyPasswordAuthorizationTest`, …

**Канон:** negative automation не в smoke suite; integration mount — `LoginFormTests` (без submit flow)

## Входы

empty/wrong fields

## Assert

shouldHave(text(...))

## Do

Один assert на сценарий; nested `Allure.step` — `emptyPasswordAuthorizationTest`; raw inline — `wrongPasswordAuthorizationTest`
- TestOps manual — `shortLoginAuthorizationTest` (чанк `test-manual`)

## Don't

Неверный precondition
- Искать negative methods в `tests-java/LoginTests`

