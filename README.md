# autotests-ai-app

Landing compose for [autotests.ai](https://autotests.ai) and [stage.autotests.ai](https://stage.autotests.ai): postgres + java-spring + ts-react + gateway.

- **Gateway:** `127.0.0.1:${GATEWAY_PORT:-8081}` — `/` → frontend, `/api/` → backend
- **Backend:** `backend/java/backend-java-spring/` — etalon `/api/health` (`HealthResponse`). No `Terminal*` / `/api/terminal`
- **Frontend:** `frontend/typescript/frontend-typescript-react/` — Vite `base: '/'`, Home = configurator + sticky terminal, `/stack/` = matrix board, header Home + Stack + Stage/Prod
- **Images:** `ghcr.io/autotests-ai/autotests-ai-app-backend-java-spring` and `…-frontend-typescript-react` (`:${IMAGE_TAG:-latest}`). Gateway stays `nginx:1.27-alpine`. Local `docker compose up --build` still builds from `build:`.
- **E2E pyramid:** `tests-java/` — Gradle + Selenide + Allure (terminal-panel tests removed)
- **Stage:** `deploy/stage.env` (`GATEWAY_PORT=18081`), compose project `autotests-ai-app-stage`

`/stack/` is the React matrix board (`public/stack/matrix.json`). Teaching matrix cells stay in autotests-ai-multistack-app.

## Local

```bash
docker compose up -d --build
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/
curl -sf http://127.0.0.1:8081/api/health
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/stack/
curl -sf http://127.0.0.1:8081/stack/matrix.json
```

From the monorepo: `python scripts/stands/ensure.py autotests-ai-app`.

Postgres has no host port. First up after replacing the old terminal Flyway history uses volume `pgdata_v2` (does not `down -v` the matrix).

## Env profiles (tests-java)

| Stand | Example | baseUrl |
|-------|---------|---------|
| `autotests_local` | `autotests_local_e2e` | [http://localhost:8081/](http://localhost:8081/) |
| `autotests_jenkins` | `autotests_jenkins_e2e` | [https://autotests.ai/](https://autotests.ai/) |
| `autotests_prod` | `autotests_prod_e2e` | [https://autotests.ai/](https://autotests.ai/) |

Regenerate configs: `python scripts/gen-env-configs.py`

## CD (Box3)

GitHub Actions [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): build+push both GHCR images, then SSH.

| Branch | Project | Env file | Health | Public |
|--------|---------|----------|--------|--------|
| `develop` | `autotests-ai-app-stage` | `deploy/stage.env` | `http://127.0.0.1:18081/api/health` | [https://stage.autotests.ai/](https://stage.autotests.ai/) |
| `main` | `autotests-ai-app` | — | `http://127.0.0.1:8081/api/health` | [https://autotests.ai/](https://autotests.ai/) |

Host clone: `/opt/autotests-ai-app`. Secrets (`DEPLOY_SSH_KEY`, `JWT_SECRET`, GHCR token) stay out of git. Optional host `.env` for `JWT_SECRET` — do not put `GATEWAY_PORT` there (it would steal prod). Manual:

```bash
# after images exist for IMAGE_TAG
ssh box3 'DEPLOY_TARGET=stage IMAGE_TAG=<sha> bash /opt/autotests-ai-app/deploy/box3-deploy.sh'
```

`box3-deploy.sh` pulls GHCR and `compose up` four services (never `compose build backend`). It does not `git reset --hard` the teaching matrix clone.
