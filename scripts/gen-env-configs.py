#!/usr/bin/env python
"""Generate autotests_* env profiles for autotests-ai-app tests-java."""

from __future__ import annotations

from pathlib import Path

CONFIG_DIR = Path(__file__).resolve().parents[1] / "tests-java/src/test/resources/config"
LAYERS = ("unit", "component", "integration", "api", "e2e", "visual", "manual")
KEEP = frozenset({"default.properties", "_ethalon.properties"})

GRADLE_HINT = {
    "unit": "./gradlew testUnit -Denv={env}",
    "component": "./gradlew testComponent -Denv={env}",
    "integration": "./gradlew testIntegration -Denv={env}",
    "api": "./gradlew testApi -Denv={env}",
    "e2e": "./gradlew testE2e -Denv={env}",
    "visual": "./gradlew testVisual -Denv={env}",
    "manual": "./gradlew testManual -Denv={env}",
}

LAYER_DESC = {
    "unit": "pure Java — helpers/*Test, config/*Test",
    "component": "@Tag(component) — not used in landing bootstrap",
    "integration": "@Tag(layout,mount) — mount probes",
    "api": "@Layer(api) @Tag(api) — Rest Assured /api/health",
    "e2e": "@Layer(e2e) — smoke via testE2e",
    "visual": "CI slice: @Layer(e2e) + @Tag(visual)",
    "manual": "@Tag(manual) — exploratory stubs",
}

COMMON_BROWSER = {
    "browser": "chrome",
    "browserVersion": "148.0",
    "browserSize": "1920x1280",
    "headless": "true",
    "closeBrowserAfterAll": "true",
    "enableHar": "false",
    "enableVnc": "false",
    "enableVideo": "false",
}

ATTACH_OFF = {
    "attachBrowserConsoleLogs": "false",
    "attachHarLogs": "false",
    "attachLastScreenshot": "false",
    "attachPageSource": "false",
    "attachVideo": "false",
    "enableAllureSelenideListener": "false",
}

STANDS = {
    "autotests_local": {
        "baseUrl": "http://localhost:8081/",
        "apiBaseUrl": "http://localhost:8081/",
        "remoteUrl": "",
        "videoFolder": "",
        "logToConsole": "true",
        "selenideLogToConsole": "true",
        "rootLogLevel": "info",
    },
    "autotests_jenkins": {
        "baseUrl": "http://172.17.0.1:8081/",
        "apiBaseUrl": "http://172.17.0.1:8081/",
        "hubUrl": "http://172.17.0.1:4444/",
        "uiUrl": "http://172.17.0.1:8080/",
        "remoteUrl": "http://172.17.0.1:4444/wd/hub",
        "videoFolder": "http://172.17.0.1:4444/video/",
        "logToConsole": "false",
        "selenideLogToConsole": "false",
        "rootLogLevel": "info",
    },
    "autotests_prod": {
        "baseUrl": "https://autotests.ai/",
        "apiBaseUrl": "https://autotests.ai/",
        "remoteUrl": "https://user1:1234@selenoid.qa.guru/wd/hub",
        "videoFolder": "https://selenoid.qa.guru/video/",
        "browserSize": "1740x1080",
        "logToConsole": "false",
        "selenideLogToConsole": "false",
        "rootLogLevel": "warn",
    },
}


def layer_overlay(layer: str) -> dict[str, str]:
    if layer == "unit":
        return {
            "allureReportMode": "none",
            "allureAgentMode": "none",
        }
    if layer == "component":
        return {"closeBrowserAfterEach": "true", **ATTACH_OFF}
    if layer == "integration":
        return {"closeBrowserAfterEach": "true", **ATTACH_OFF}
    if layer == "api":
        return {
            "allureReportMode": "allure3",
            "allureAgentMode": "none",
            **ATTACH_OFF,
        }
    if layer == "e2e":
        return {
            "closeBrowserAfterEach": "false",
            **ATTACH_OFF,
        }
    if layer == "visual":
        return {
            "closeBrowserAfterEach": "false",
            "updateBaselines": "false",
            "baselinesDir": "screenshots",
            "visualDiffThreshold": "0.015",
            **ATTACH_OFF,
        }
    if layer == "manual":
        return {
            "closeBrowserAfterEach": "true",
            "headless": "false",
            "attachLastScreenshot": "true",
            "attachPageSource": "true",
            "enableAllureSelenideListener": "true",
            "attachBrowserConsoleLogs": "false",
            "attachHarLogs": "false",
            "attachVideo": "false",
        }
    raise ValueError(layer)


def format_file(stand: str, layer: str, values: dict[str, str]) -> str:
    env = f"{stand}_{layer}"
    lines = [
        f"# {stand} — {layer} ({LAYER_DESC[layer]})",
        f"# {GRADLE_HINT[layer].format(stand=stand, env=env)}",
        "",
    ]
    sections = [
        ("Allure report", ["allureReportMode", "allureAgentMode"]),
        (
            "Allow attachments after each test",
            [
                "attachBrowserConsoleLogs",
                "attachHarLogs",
                "attachLastScreenshot",
                "attachPageSource",
                "attachVideo",
                "enableAllureSelenideListener",
            ],
        ),
        ("Target app", ["baseUrl", "basePath"]),
        ("REST API", ["apiBaseUrl"]),
        ("Selenoid hub", ["hubUrl", "uiUrl", "smokeUrl"]),
        (
            "Browser configuration",
            ["browser", "browserVersion", "browserSize", "headless", "closeBrowserAfterEach", "closeBrowserAfterAll"],
        ),
        (
            "Remote browser hub configuration",
            ["enableHar", "enableVnc", "enableVideo", "videoFolder", "remoteUrl"],
        ),
        ("Visual baselines", ["updateBaselines", "baselinesDir", "visualDiffThreshold"]),
        ("Console log", ["logToConsole", "selenideLogToConsole", "rootLogLevel"]),
    ]
    for title, keys in sections:
        block = [values[k] for k in keys if k in values]
        if not block:
            continue
        if title == "Allow attachments after each test":
            lines.append("# Allow attachments after each test")
        else:
            lines.append(f"# {title}")
        for key in keys:
            if key not in values:
                continue
            if key == "enableAllureSelenideListener":
                lines.append("# Allow allure steps listener")
            val = values[key]
            if val == "" and key in ("remoteUrl", "videoFolder", "baseUrl", "basePath", "apiBaseUrl"):
                lines.append(f"# {key}=")
            else:
                lines.append(f"{key}={val}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def build_values(stand: str, layer: str) -> dict[str, str]:
    values = {**COMMON_BROWSER, **ATTACH_OFF, **STANDS[stand], **layer_overlay(layer)}
    if layer == "unit":
        values["allureReportMode"] = "none"
    return values


def main() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    for path in CONFIG_DIR.glob("*.properties"):
        if path.name not in KEEP:
            path.unlink()
    for stand in STANDS:
        for layer in LAYERS:
            name = f"{stand}_{layer}.properties"
            (CONFIG_DIR / name).write_text(format_file(stand, layer, build_values(stand, layer)), encoding="utf-8")
            print(f"wrote {name}")


if __name__ == "__main__":
    main()
