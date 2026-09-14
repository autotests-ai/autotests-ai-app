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

From the monorepo: `python scripts/stands/ensure.py autotests-ai-app`. Dest zip (`POST /api/assemble`) and dest user/cloud tree need `ASSEMBLE_URL`. Local compose default `http://host.docker.internal:3032` → `ensure.py assemble-zip` (`extra_hosts` host-gateway). Prod overlay resets extra_hosts and uses docker0 `[http://172.17.0.1:3032](http://172.17.0.1:3032)` (Box3 systemd `assemble-zip`, not `0.0.0.0`, not nginx on autotests.ai). Empty URL → 503. Browser CORS to assemble-zip is loopback fallback only.

Home import URL/zip is `POST /api/adopt` (`ADOPT_URL`), not `/api/assemble`. After Import, dest zip is `POST /api/adopt/zip` `{dest}` (the adopt tree, not etalon). Local compose default `http://host.docker.internal:3033` → `ensure.py adopt`. Empty URL → 503. Never a PAT.

Dest cloud is school IdP, not GitHub OAuth: YAML `cloud.via: idp`, `created: true` after `POST /api/cloud/repos`. Login after a session. Frontend env `VITE_IDP_AUTHORIZE_URL` + `VITE_IDP_CLIENT_ID` — empty → Home button hidden. Backend `POST /api/oauth/idp` exchanges the code (`IDP_CLIENT_SECRET`, `IDP_TOKEN_URL`, `IDP_USERINFO_URL`) and returns `{login}` only — no token in JSON; the IdP token is an httpOnly cookie (`Path=/api/cloud`). `POST /api/cloud/repos` creates `github.com/autotests-cloud/{idp-login}-{e2e.stack}` with `GITHUB_CLOUD_TOKEN` (empty → 503). Never a PAT, never push. Redirect `/oauth/idp/callback`. Keycloak client **`autotests-ai`** lives in `auth-qa-guru-home` (`ensure-autotests-ai-client.py`), not this repo. Secret: `~/.config/auth-qa-guru/autotests-ai.env` → host compose `IDP_CLIENT_SECRET`, never `VITE_`, never git.

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

Host clone: `/opt/autotests-ai-app`. Secrets (`DEPLOY_SSH_KEY`, `JWT_SECRET`, GHCR token, `IDP_CLIENT_SECRET`, `GITHUB_CLOUD_TOKEN`) stay out of git. Optional host `.env` for `JWT_SECRET`, IdP, org token, `ASSEMBLE_URL`, and `ADOPT_URL` — do not put `GATEWAY_PORT` there (it would steal prod).

Dest cloud on stage/prod:

1. **SPA bake (public).** GitHub repository variables (not secrets) `VITE_IDP_CLIENT_ID=autotests-ai` and `VITE_IDP_AUTHORIZE_URL=https://auth.qa.guru/realms/qaguru/protocol/openid-connect/auth`. `deploy.yml` passes them as frontend Docker `build-args`. Empty → dest cloud button hidden.
2. **IdP secret (host 600).** Compose already interpolates `IDP_*`. On Box3, `/opt/autotests-ai-app/.env` mode `600` — not in git, not `cat` into a log, not a `VITE_` key.
3. **Org token (same file, 600).** Compose already interpolates `GITHUB_CLOUD_TOKEN`. Empty → `POST /api/cloud/repos` 503. Token of the school org `autotests-cloud` (`GithubCloudProperties`): create `github.com/autotests-cloud/{idp-login}-{e2e.stack}`. Reuse the school token that already creates `autotests-cloud/*` (tms-automator). Not a student PAT, not `{login}-app-tests`, not `github_oauth`, not `VITE_`. Do not mint a GitHub App in this slice.
4. **Assemble (same file, 600).** `ASSEMBLE_URL=http://172.17.0.1:3032` — docker0, reachable from the backend container without host-gateway. systemd unit `[deploy/assemble-zip.service](deploy/assemble-zip.service)` binds that address only (`assemble-serve.py --host 172.17.0.1`). Root is `/opt/assemble-zip` (monorepo subset, not a copy of `assemble-repo.py` in this repo). Empty / down stand → dest zip and `POST /api/cloud/repos/contents` 503. Not a public `0.0.0.0:3032`, not `ensure.py` as prod SSOT.
5. **Adopt (same file, 600).** `ADOPT_URL=http://172.17.0.1:3033` — docker0, same `/opt/assemble-zip`, systemd `[deploy/adopt.service](deploy/adopt.service)` (`adopt-serve.py --host 172.17.0.1`). Not `/opt/adopt`, not `:3032`, not `0.0.0.0`, not a sidecar. Empty / down stand → `POST /api/adopt` and `POST /api/adopt/zip` 503. Probe is `POST /adopt?dry_run=1` (fill) and `POST /adopt/zip?dry_run=1` (dest zip), not `GET /health` alone.

```bash
# qaguru@box3 — editor, never cat. Do not truncate JWT_SECRET or IDP_*.
umask 077
touch /opt/autotests-ai-app/.env
chmod 600 /opt/autotests-ai-app/.env
# IDP_CLIENT_ID=autotests-ai
# IDP_TOKEN_URL=https://auth.qa.guru/realms/qaguru/protocol/openid-connect/token
# IDP_USERINFO_URL=https://auth.qa.guru/realms/qaguru/protocol/openid-connect/userinfo
# IDP_CLIENT_SECRET=<KC_CLIENT_SECRET_AUTOTESTS_AI from ~/.config/auth-qa-guru/autotests-ai.env>
# GITHUB_CLOUD_TOKEN=<school org token for autotests-cloud, never a student PAT>
# ASSEMBLE_URL=http://172.17.0.1:3032
# ADOPT_URL=http://172.17.0.1:3033
```

`box3-deploy.sh` does not print `.env`. Prod dest zip and cloud tree use docker0 `ASSEMBLE_URL`, not host-gateway. Host-built `IMAGE_TAG=amd64` is live until this commit is on origin (GHCR `5a9e182` has no `/api/assemble`).

Manual:

```bash
# after images exist for IMAGE_TAG
ssh box3 'DEPLOY_TARGET=stage IMAGE_TAG=<sha> bash /opt/autotests-ai-app/deploy/box3-deploy.sh'
```

`box3-deploy.sh` pulls GHCR and `compose up` four services (never `compose build backend`). It does not `git reset --hard` the teaching matrix clone.
