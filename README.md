# autotests-ai-app

Spring Boot (Java 21) + PostgreSQL landing for [autotests.ai](https://autotests.ai).

- **Backend:** `backend/` — REST `GET /api/terminal`, static UI (main слева, terminal справа, авто-загрузка при открытии)
- **E2E:** `tests-java/` — Gradle + Selenide + Allure, env `autotests_{local,jenkins,prod}_*`
- **Deploy:** `docker-compose.yml` — только `postgres` + `backend` на `127.0.0.1:8081` (Selenoid UI остаётся на `:8080`)
- **Nginx:** `deploy/nginx/autotests.ai.conf` — landing proxy; canonical stacks at `/stack/{backend}/{frontend}/` (locations generated from reference-app-copy matrix)
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

## Server deploy (136.243.89.21 — selenoid user)

```bash
mkdir -p ~/autotests-ai-app
git clone https://github.com/autotests-ai/autotests-ai-app.git ~/autotests-ai-app
cd ~/autotests-ai-app
docker compose up -d --build
```

Legacy path `/opt/autotests-ai-landing` и `/home/selenoid/autotests-ai-landing` не используются на prod.

## Autodeploy (GitHub Actions → production)

Push в `main` (и `repository_dispatch: deploy`) запускает [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): SSH на `136.243.89.21` (user `selenoid`), `git pull`, `docker compose up --build`, smoke `https://autotests.ai`.

**Secrets / variables** (Settings → Secrets and variables → Actions):

| Name | Kind | Value |
|------|------|-------|
| `DEPLOY_SSH_KEY` | secret | `~/.ssh/selenoid_prod_ed25519` (private) |
| `DEPLOY_HOST` | variable (optional) | `136.243.89.21` |
| `DEPLOY_USER` | variable (optional) | `selenoid` |

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
