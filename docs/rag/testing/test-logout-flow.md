---
id: test-logout-flow
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure, page_object]
---
# Logout flow (RAG)

**id:** `test-logout-flow`

Паттерны logout — ethalon `tests-java/src/test/java/_ethalon/ladder/LogoutTests.java`. В каноне `tests-java/` отдельного `LogoutTests` нет (пирамида: smoke login в `LoginTests`, storage shortcut — `LoggedInBaselineTests` + `test-storage-shortcut`).

## Методы (ethalon)

| Метод | Паттерн |
|-------|---------|
| `successfulLogoutTest` | Form login → assert welcome → logout → assert login form; `poFluent=false`, explicit PO instances; `@Description` — anti-pattern «login+logout в одном e2e» |
| `successfulLogoutWithLocalStorageAuthenticationTest` | `openPageWithLocalStorageAuthentication` → fluent chain → logout; `chained_return`, `local_storage` |

PO: `LoggedInPage.clickLogoutButton()` → `LoginPage`.

## Входы

Credentials `user1` / `password1`; localStorage keys — `test-storage-shortcut`.

## Assert

После logout: `loginPage.shouldHaveFormTitle("Login Form")`.

## Do

- Для consumer: предпочитать **отдельные** тесты login и logout (не `@Description` bad practice).
- Fluent cross-page chain — якорь `successfulLogoutWithLocalStorageAuthenticationTest`; explicit steps — `successfulLogoutTest`.
- Storage shortcut — `LoggedInPage.openPageWithLocalStorageAuthentication`.

## Don't

- Требовать `LogoutTests` в каноне `tests-java/` для CI smoke.
- Копировать anti-pattern «один e2e на login+logout» в production suite.
