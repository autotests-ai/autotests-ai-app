---
id: cfg-env-profile
domain: config
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# Выбор окружения

**id:** `cfg-env-profile`

## Файлы

`TestConfig, config/*.properties`

## Входы

`-Denv=local_e2e` → `config/local_e2e.properties`

Именование: `{stand-base}_{deployment}_{suffix}.properties` — сегменты через `_`; дефис только внутри имени стенда (`one-page-form_prod_e2e`). Stand-only (`local.properties`, `ci.properties`) **не используются**.

## Assert

Config без NPE

## Do

MERGE system + classpath; @DefaultValue на опциональных ключах

## Don't

Хардкод URL в тестах

