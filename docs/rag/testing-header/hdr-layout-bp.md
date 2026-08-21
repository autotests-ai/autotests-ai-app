---
id: hdr-layout-bp
domain: testing-header
phase: 4b
adr: 003
tags: [header, selenide]
---
# Breakpoint nav

**id:** `hdr-layout-bp`

## Файлы

`HeaderLayout, LayoutCss`

## Входы

390/768/769/1280

## Assert

nav hidden ≤768

## Do

getComputedStyle display/visibility

## Don't

Новые breakpoints без ADR

