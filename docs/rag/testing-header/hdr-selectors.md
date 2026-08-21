---
id: hdr-selectors
domain: testing-header
phase: 4b
adr: 003
tags: [selectors, data-testid]
---
# Header selectors (template-project)

Источник: `templates/header.html`, `frontend/js/header.js`. Gap probe: `.header__inner`.

| Роль | data-testid |
|------|-------------|
| Корень | `header` |
| Brand | `header-brand-link` |
| Nav | `header-nav`, `header-nav-home`, `header-nav-courses`, `header-nav-about` |
| Search | `header-search`, `header-search-input` |
| Tools | `header-tools`, `header-lang-toggle`, `header-lang-label`, `header-theme-toggle`, `header-github`, `header-github-pages` |

## Don't (legacy one-page-form)

`.header-left`, `nav-tools`, `forms-link`, `#lang-menu`, `#lang-label`.
