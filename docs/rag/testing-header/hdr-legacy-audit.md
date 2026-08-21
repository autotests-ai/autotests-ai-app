---
id: hdr-legacy-audit
domain: testing-header
phase: 4b
adr: 003
tags: [legacy, audit]
---
# Legacy audit — tests-java/legacy-code

AI-generated против consumer one-page-form. Reference only.

| Источник | Вердикт | Действие |
|----------|---------|----------|
| HeaderControlsTests / HeaderControls | Взять идею | behavioral smoke; селекторы header-* |
| NavLayout gap scripts | Взять паттерн | HeaderLayout + .header__inner; gap 16px |
| ViewportHelper | Взять | CDP viewport |
| LayoutCss | Взять | BREAKPOINT 768 |
| NavScreenshot | Отложить | 4b.2 only |
| NavStabilityVisualTests | Отклонить | cross-page consumer |
| NavSpacingVisualTests (dashboard) | Отклонить | не header |
| LandingPage*, DashboardLayoutTests | Отклонить | вне scope |
| BrowserSessionHelper.openDemoPage | Не копировать | open("/header.html") достаточно |
