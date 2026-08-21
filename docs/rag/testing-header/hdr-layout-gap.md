---
id: hdr-layout-gap
domain: testing-header
phase: 4b
adr: 003
tags: [header, selenide]
---
# Spacing канон

**id:** `hdr-layout-gap`

## Файлы

`HeaderLayout`

## Входы

desktop viewport

## Assert

gap 16px на .header__inner

## Do

JS probe getBoundingClientRect; tolerance 0.6px

## Don't

EXPECTED_GAP_PX=12 из legacy

