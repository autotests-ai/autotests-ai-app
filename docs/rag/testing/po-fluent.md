---
id: po-fluent
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# Читаемый flow

**id:** `po-fluent`

## Файлы

**Канон:** `tests-java/src/test/java/pages/LoginPage.java`, `LoggedInPage.java` — smoke `LoginTests.shouldLoginWithValidCredentials`

**Ethalon (RAG):** fluent chain logout — `_ethalon/ladder/LogoutTests.successfulLogoutWithLocalStorageAuthenticationTest` (чанк `test-logout-flow`); explicit multi-step — `successfulLogoutTest`

## Входы

credentials

## Assert

Chain без void

## Do

return this / next page; `clickLogoutButton()` → `LoginPage`

## Don't

assert в PO без @Step name

