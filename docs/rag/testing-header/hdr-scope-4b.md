---
id: hdr-scope-4b
domain: testing-header
phase: 4b
adr: 003
tags: [scope, header, frontend]
---
# Scope фазы 4b — header component + embed

Автотесты header — **не** через harness `/header.html`. Preview harness остаётся для playground и rule `frontend-preview`.

| Параметр | Значение |
|----------|----------|
| Component target | `frontend/components.html` — секция lang-toggle |
| Embed target | `frontend/login.html` — `#app-header` + `header.js` |
| Harness preview | `frontend/header.html`, gallery `header-examples.html` — **не** PO target |
| App root | `http://localhost:3000/` (server cwd = `frontend/`) |
| Breakpoint | 768px (`layout-standard.md`) |
| Component class | `LangToggleTests` — `@Layer("component")`, `@Epic("Component Catalog")` |
| Embed class | `LoginEmbedTests` — `@Layer("integration")`, `@Tag("mount")` |

## 4b (реализовано)

- Component: hit area 36px, icon 18px, label RU на `components.html`
- Integration: embedded header visible на login после mount

## 4.visual (opt-in)

Visual baselines: login + logged-in only (`visual-baseline`). Header harness PNG — **не** в каноне CI.

## Don't

- `HeaderTests` / `HeaderPreviewPage` / harness PO — legacy reference only
- Landing, dashboard iframe, cross-page stability на one-page-form
