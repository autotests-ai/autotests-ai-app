---
id: remote-selenoid
domain: testing
phase: 4a
adr: 002
tags: [selenide, junit, allure]
---
# CI remote browser

**id:** `remote-selenoid`

## Файлы

`{stand-base}_*.properties` — см. таблицу env profiles в `e2e-config-keys.md`.

## Входы

remoteUrl

## Assert

Session on hub

## Do

selenoid:options map

## Don't

Local chrome flags на remote

