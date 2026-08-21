---
id: test-storage-shortcut
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# Bypass UI login

**id:** `test-storage-shortcut`

## Файлы

`tests-java/src/test/java/pages/LoggedInPage.java` — `openPageWithLocalStorageAuthentication`

**Канон visual:** `LoggedInBaselineTests` (`@Tag("visual")`)

**Logout chain (ethalon):** `_ethalon/ladder/LogoutTests.successfulLogoutWithLocalStorageAuthenticationTest` — чанк `test-logout-flow`

## Входы

authUser, userbase

## Assert

Welcome без submit

## Do

Ключи из app one-page-form

## Don't

Выдумывать keys; несуществующие URL

