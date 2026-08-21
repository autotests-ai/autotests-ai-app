---
id: allure-selenide-listener
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# AllureSelenide listener

**id:** `allure-selenide-listener`

## Файлы

`tests-java/src/test/java/allure/AllureSelenideListeners`, `annotations/EnableAllureSelenideListener`, `extensions/AllureSelenideListenerExtension`

**Ethalon якоря:** `_ethalon/ladder/LoginTests.emptyLoginAuthorizationTest`, `emptyLoginAndPasswordAuthorizationTest`

## Входы

`enableAllureSelenideStepsListener` в env profile; per-test `@EnableAllureSelenideListener` / `@EnableAllureSelenideListener(false)`

## Assert

В Allure — auto-steps из Selenide (`open`, `setValue`, `click`, `should`)

## Do

- Глобально: `TestBase.@BeforeAll` → `AllureSelenideListeners.setEnabled(true)` при флаге в config
- Per-test override: `@EnableAllureSelenideListener` на методе; после теста `restoreGlobal()`
- Якорь listener ON: `emptyLoginAuthorizationTest` — raw inline `$()`, **без** ручных `Allure.step`
- Якорь explicit OFF: `emptyLoginAndPasswordAuthorizationTest` — `@EnableAllureSelenideListener(false)`

## Don't

- Смешивать `Allure.step` и `AllureSelenide` в одном тесте (дубли шагов в отчёте)
- Включать listener в consumer без осознанного выбора одного источника шагов
