# backend-java-spring

Spring Boot JSON API copied from the multistack etalon for autotests-ai-app.
Postgres DB: `autotests_ai` (compose). Public surface in this phase: `GET /api/health`.

**Status:** active (landing scaffold — not a matrix cell).

```
https://autotests.ai/stack/backend-java-spring/{frontend}/
https://autotests.ai/stack/backend-java-spring/api/
```

Tests: `src/test/java/` — plain units, `@WebMvcTest` slices (suite label `slice`) and a
persistence slice (`@DataJpaTest` + Testcontainers PostgreSQL: Flyway migrations, seed,
unique constraint against the real database — **requires a running Docker daemon**, same
as docker-compose for the app itself).
Classical **integration** is `src/test/java/dev/multistack/app/integration/` +
`IntegrationTestBase` (`@SpringBootTest` + Testcontainers PG) — CI job `integration-tests`
(after `unit-tests`, before build/deploy). `TestRestTemplate` on `RANDOM_PORT` talks to that
in-process context; it is **not** the `api` layer (RestAssured in `tests/api/` after `deploy-backend`).
Run: `./gradlew check` (JaCoCo gate: 100% line **and** 100% branch coverage — earned by
behavioral tests; entity plumbing is executed by the persistence slice, not by reflection).

## Contract

`service` in `/api/health` equals this module id and must match `health_service` in
[`deploy/matrix.yaml`](../../../deploy/matrix.yaml).

| Method | Path | Auth | Success | Body |
|--------|------|------|---------|------|
| GET | `/api/health` | — | 200 | `{"status":"ok","service":"backend-java-spring"}` |
| GET | `/api/items` | — | 200 | `{"items":[{"id","name","description"}],"source":"postgresql"}` |
| GET | `/api/openapi.yaml` | — | 200 | classpath copy of `_contract/openapi.yaml` |
| GET | `/api/docs` | — | 200 | Swagger UI (`url` = `./openapi.yaml`) |
| POST | `/api/auth/register` | — | 201 | `{"token","username","redirectUrl":"/"}` |
| POST | `/api/auth/login` | — | 200 | `{"token","username","redirectUrl":"/"}` |
| POST | `/api/auth/logout` | — | 204 | empty |
| GET | `/api/auth/me` | Bearer | 200 | `{"username"}` |
| DELETE | `/api/auth/me` | Bearer | 204 | empty |

Logout is **stateless by design**: it never invalidates the JWT server-side — the token keeps
verifying until it expires or the account is deleted. `DELETE /api/auth/me` is the authenticated
self-delete: after it, the same token yields 401 (user row is gone) — and test suites use it to
clean up the accounts they register.

Errors are always `{"message": "..."}`:

| Status | When | Message |
|--------|------|---------|
| 400 | credentials fail validation | field-specific |
| 401 | bad credentials / missing-invalid token | `Wrong login or password` · `Unauthorized` |
| 409 | username already exists | `Username already taken` |

Validation: `username` 3–64 chars, `password` 6–128 chars.
`/api/items` is ordered by `id`; `register` maps a lost unique-constraint race to 409.

Seed: user `user1` / `password1`, plus 3 items from Flyway `V1__items.sql`.

## Layout

```
dev.multistack.app/
  MultistackApplication.java
  config/ controller/ dto/ entity/ exception/ repository/ service/
```

**API-only.** Controllers expose `/api/**`; UI lives in `frontend/*` nginx containers.
CSRF is disabled by design — auth is stateless Bearer JWT, no ambient cookie credential.

Kotlin twin: [`../../kotlin/backend-kotlin-spring/`](../../kotlin/backend-kotlin-spring/).
