---
id: hdr-behavior
domain: testing-header
phase: 4b
adr: 003
tags: [header, selenide]
---
# Controls smoke

**id:** `hdr-behavior`

> **Legacy reference:** harness PO удалён. Канон — embed `LoginEmbedTests` на `login.html`; component — `LangToggleTests`.

## Файлы

`LoginEmbedTests`, `LangToggleTests` (канон); legacy — `HeaderComponent`, `HeaderPreviewPage`, `HeaderTests`

## Входы

theme/lang clicks

## Assert

theme/lang/href

## Do

PO + @Step

## Don't

Consumer #lang-menu API

