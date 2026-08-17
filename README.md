# autotests-ai-app

Spring Boot (Java 21) + PostgreSQL landing for [autotests.ai](https://autotests.ai).

- **Backend:** `backend/` — REST `GET /api/terminal`, static UI (main слева, terminal справа, авто-загрузка при открытии)
- **E2E:** `tests-java/` — Gradle + Selenide + Allure, env `autotests_{local,jenkins,prod}_*`
- **Deploy:** `docker-compose.yml` — только `postgres` + `backend` на `127.0.0.1:8081` (Selenoid UI остаётся на `:8080`)
- **Nginx:** `deploy/nginx/autotests.ai.conf` — landing proxy; canonical stacks at `/stack/{backend}/{frontend}/` (locations generated from autotests-ai-multistack-app matrix)
- **Jenkins:** `deploy/jenkins/autotests-ai-app-deploy.Jenkinsfile`

## Local dev

```bash
# PostgreSQL (docker)
docker compose up -d postgres

# Backend (port 8080)
cd backend && ./gradlew bootRun

# E2E smoke
cd tests-java
./gradlew testE2e -Denv=autotests_local_e2e -Dheadless=true
```

## Env profiles

| Stand | Example | baseUrl |
|-------|---------|---------|
| `autotests_local` | `autotests_local_e2e` | `http://localhost:8081/` (docker) or `8080` (`bootRun`) |
| `autotests_jenkins` | `autotests_jenkins_e2e` | `https://autotests.ai/` + Selenoid `127.0.0.1:4444` |
| `autotests_prod` | `autotests_prod_e2e` | `https://autotests.ai/` + remote Selenoid cloud |

Regenerate configs: `python scripts/gen-env-configs.py`

## Server deploy (box3 — `qaguru@212.92.101.15`)

```bash
ssh qaguru@212.92.101.15 bash /opt/autotests-ai-app/deploy/box3-deploy.sh
```

Каталог на хосте: `/opt/autotests-ai-app`. Legacy `/home/selenoid/autotests-ai-app` на этом боксе нет.

## Autodeploy (GitHub Actions → production)

Push в `main` (и `repository_dispatch: deploy`) запускает [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): SSH на `212.92.101.15` (user `qaguru`), затем `deploy/box3-deploy.sh`.

**Secrets / variables** (Settings → Secrets and variables → Actions):

| Name | Kind | Value |
|------|------|-------|
| `DEPLOY_SSH_KEY` | secret | private ed25519 whose pub is in `qaguru` `authorized_keys` (`gha-autotests-ai-app`) |
| `DEPLOY_HOST` | variable (optional) | `212.92.101.15` |
| `DEPLOY_USER` | variable (optional) | `qaguru` |

Logo-generator после propagate шлёт `repository_dispatch` → этот workflow.

Jenkins job (optional): Pipeline from SCM → `deploy/jenkins/autotests-ai-app-deploy.Jenkinsfile`.

E2E on Jenkins agent:

```bash
cd tests-java
./gradlew testE2e -Denv=autotests_jenkins_e2e
```

## Pyramid slices

```bash
./gradlew testUnit
./gradlew testIntegration
./gradlew testApi
./gradlew testE2e
```
