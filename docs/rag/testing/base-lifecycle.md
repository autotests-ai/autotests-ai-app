---
id: base-lifecycle
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# Setup/teardown

**id:** `base-lifecycle`

## Файлы

`TestBase`

## Входы

config flags

## Assert

Driver один раз на class

## Do

@BeforeAll config; @AfterEach attachments + optional close

## Don't

Setup в каждом @Test

