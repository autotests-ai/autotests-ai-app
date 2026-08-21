---
id: hdr-viewport
domain: testing-header
phase: 4b
adr: 003
tags: [header, selenide]
---
# Stable width

**id:** `hdr-viewport`

## Файлы

`ViewportHelper`

## Входы

width px

## Assert

CDP metrics applied

## Do

Emulation.setDeviceMetricsOverride; deviceScaleFactor 1

## Don't

Только window().setSize на CI

