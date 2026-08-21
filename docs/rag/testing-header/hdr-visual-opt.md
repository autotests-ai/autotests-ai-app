---
id: hdr-visual-opt
domain: testing-header
phase: 4.visual
adr: 003
tags: [header, selenide, visual]
---
# Header screenshot (opt-in)

**id:** `hdr-visual-opt`

Header-часть cross-epic visual. Общий паттерн: чанк **`visual-baseline`**.

**Не в каноне `tests-java/`:** harness `/header.html` — playground/preview, не target PO. В каноне visual только login/logged-in (`LoginBaselineTests`, `LoggedInBaselineTests`).

## Когда применять

Consumer или отдельный чат на header harness: тот же `ScreenshotBaseline`, отдельный `*BaselineTests`, `@Layer("e2e")` + `@Tag("visual")`.

## Файлы (шаблон)

| Файл | Назначение |
|------|------------|
| `helpers/ScreenshotBaseline.java` | shared helper (канон) |
| `tests/*BaselineTests.java` | отдельный класс, не смешивать с smoke/layout |
| `[data-testid=header]` | селектор crop |
| `screenshots/header/` | baseline PNG (390 / 768 / 1280) |

## Входы

- `-DupdateBaselines=true` — перезапись эталонов
- `-Denv=local_visual` или `testVisual` — CI slice (не `@Layer`)
- viewports — `layout-standard.md`

## Assert

pixel ratio ≤ `visualDiffThreshold` (см. `visual-baseline`)

## Do

- Переиспользовать `ScreenshotBaseline`, не `HeaderScreenshot`
- `@Layer("e2e")` на классе + `@Tag("visual")` на методе
- Baselines — opt-in PR / nightly, не smoke PR

## Don't

- Открывать `/header.html` в каноне template-project (component + embed на login — ADR 003)
- Baselines в smoke/layout PR (4b)
- Отдельный флаг `updateHeaderBaselines` — только `updateBaselines`
