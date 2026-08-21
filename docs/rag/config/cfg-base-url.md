---
id: cfg-base-url
domain: config
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# Корень приложения

**id:** `cfg-base-url`

## Файлы

`ConfigReader.resolveBaseUrl`

## Входы

baseUrl или basePath

## Assert

open("/login.html") резолвится

## Do

Trim; trailing /; fail fast если `baseUrl` и `basePath` пустые. Приоритет: `baseUrl` → `basePath`. Страницы: фиксированные пути в PO — `open("/login.html")`, `open("/header.html")`. Один `./gradlew test` — один стенд.

## Don't

basePath в interface без wiring

