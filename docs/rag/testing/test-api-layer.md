---
id: test-api-layer
domain: testing
phase: 4.pyramid
adr: 004
tags: [structure, layer, api, rest-assured]
---
# API layer (Rest Assured)

**id:** `test-api-layer`

HTTP smoke без браузера. **`@Layer("api")`** + **`@Tag("api")`**. Stack: Rest Assured + `ApiTestBase`.

## Файлы

| Путь | Назначение |
|------|------------|
| `api/ApiTestBase.java` | `RestAssured.baseURI`, Allure filter |
| `tests/api/*Tests.java` | API smoke (канон: `HubStatusTests`) |
| `config/TestConfig.apiBaseUrl` | override base URI; пустой → `hubUrl` |

## Config

```properties
# REST API (@Layer api — Rest Assured; empty → hubUrl)
apiBaseUrl=
hubUrl=http://127.0.0.1:4444/
```

`ConfigReader.resolveApiBaseUrl()` — приоритет: `apiBaseUrl` → `hubUrl` → fail fast.

## Gradle

```bash
./gradlew testApi
./gradlew testApi -Denv=selenoid_local   # selenoid_local_api.properties
./gradlew test -Denv=selenoid_github_api -DincludeTags=api -DskipHealthCheck=true
```

Prerequisite: Selenoid hub на `hubUrl` (local: `dev/scripts/start-selenoid.sh` в selenoid-home).

## Do

- Новый endpoint → отдельный `*Tests` в `tests/api/`, один concern на класс.
- Assert через Rest Assured `then()` + Hamcrest; шаги — `@DisplayName` / AllureRestAssured.
- Consumer selenoid-home: sessions API, UI backend — тот же паттерн.

## Don't

- `@Layer("api")` + Selenide / `TestBase` — только `ApiTestBase`.
- `@Tag("api")` вместе с `@Tag("smoke")` на одном методе.
- `-DincludeTags=api` без `-DskipHealthCheck=true` — login.html health check не нужен.
