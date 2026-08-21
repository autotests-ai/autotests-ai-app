---
id: test-style-ladder
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# Учебная градация

**id:** `test-style-ladder`

## Файлы

**Канон smoke:** `tests-java/src/test/java/tests/LoginTests.java` — только `shouldLoginWithValidCredentials`

**Ethalon (runnable, не CI):** `tests-java/src/test/java/_ethalon/ladder/LoginTests.java`, `LogoutTests.java`

## Входы

—

## Assert

negative и smoke проходят (учебные примеры в RAG)

## Do

- smoke → PO (`shouldLoginWithValidCredentials`) — канон + учебный пример
- negative ladder (RAG only): raw none → nested manual step → listener ON → listener explicit OFF → TestOps manual (`shortLoginAuthorizationTest`)
- logout (RAG): form login vs localStorage shortcut — чанк `test-logout-flow`
- закомментированный raw Selenide — baseline «до PO»
- manual TestOps vs exploratory — чанк `test-manual`

## Don't

- Требовать PO везде в учебном репо
- Смешивать ручные `Allure.step` и `AllureSelenide` в одном методе
- Искать ladder-методы в `tests-java/LoginTests` — там один smoke (чанк `test-pyramid`)
