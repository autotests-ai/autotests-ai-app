# autotests-ai-app

Landing compose for [autotests.ai](https://autotests.ai): postgres + java-spring + ts-react + gateway.

- **Gateway:** `127.0.0.1:${GATEWAY_PORT:-8081}` — `/` → frontend, `/api/` → backend
- **Backend:** `backend/java/backend-java-spring/` — etalon `/api/health` (`HealthResponse`). No `Terminal*` / `/api/terminal`
- **Frontend:** `frontend/typescript/frontend-typescript-react/` — Vite `base: '/'`, Home = empty DS `page-shell`, `/stack/` = matrix board, header Home + Stack + Stage/Prod
- **E2E pyramid:** `tests-java/` — Gradle + Selenide + Allure (terminal-panel tests removed)
- **Stage ports (not wired to Box3 in this phase):** `deploy/stage.env` (`GATEWAY_PORT=18081`)

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

Postgres has no host port. First up after replacing the old terminal Flyway history: `docker compose down -v` then `up`.

## Env profiles (tests-java)

| Stand | Example | baseUrl |
|-------|---------|---------|
| `autotests_local` | `autotests_local_e2e` | [http://localhost:8081/](http://localhost:8081/) |
| `autotests_jenkins` | `autotests_jenkins_e2e` | [https://autotests.ai/](https://autotests.ai/) |
| `autotests_prod` | `autotests_prod_e2e` | [https://autotests.ai/](https://autotests.ai/) |

Regenerate configs: `python scripts/gen-env-configs.py`

## Server deploy (box3)

Host vhosts: `deploy/nginx/autotests.ai.conf` and `stage.autotests.ai.conf` (not applied until cutover). GHCR / stage CD are later.

```bash
ssh qaguru@212.92.101.15 bash /opt/autotests-ai-app/deploy/box3-deploy.sh
```
