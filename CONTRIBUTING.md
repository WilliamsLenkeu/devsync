# Contributing to DevSync

## Prerequisites

- Node.js ≥ 22 (24 recommended), pnpm 11 (`corepack enable`)
- PostgreSQL 16 — locally via **wslc-compose** (preferred on this machine) or Docker Compose
- Git

## Local setup

```powershell
git clone <repo> && cd devsync
pnpm install
Copy-Item .env.example .env   # set JWT_ACCESS_SECRET (≥ 32 chars)
pnpm db:up                    # starts postgres:16-alpine (wslc-compose)
pnpm --filter @devsync/api db:migrate
pnpm --filter @devsync/api db:seed   # optional demo data
pnpm --filter @devsync/api dev       # http://localhost:3000  docs at /docs
pnpm --filter @devsync/web dev       # http://localhost:5173  (proxies /api)
```

Docker alternative (same `docker-compose.yml`):

```bash
docker compose up -d db
# then migrate / seed / run as above
```

## Checks before a PR

```powershell
pnpm typecheck
pnpm lint
pnpm exec prettier --check .
pnpm test
pnpm --filter @devsync/api build
pnpm --filter @devsync/web build
```

API integration tests need `DATABASE_URL` (default in Vitest: `devsync_test`). Create it once:

```powershell
wslc exec devsync-db-1 psql -U devsync -c "CREATE DATABASE devsync_test"
$env:DATABASE_URL='postgresql://devsync:devsync@localhost:5432/devsync_test'
pnpm --filter @devsync/api db:deploy
```

## Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- TypeScript strict, ESM, no unnecessary deps (pnpm only)
- Authorization lives in `apps/api/src/authz.ts` — never “hide the button” only
- API shapes: `docs/api-contract.md`
- Significant decisions: `docs/decisions.md`
- Prefer the smallest working change; reuse existing helpers

## Adding an API module

1. Routes under `apps/api/src/modules/<name>/` (default-export Fastify plugin)
2. Register in `apps/api/src/modules/index.ts`
3. Update `docs/api-contract.md` and add injection tests

## Migrations

```powershell
pnpm --filter @devsync/api db:migrate --name <short_name>
```

Never edit applied migration SQL. Production deploy: `pnpm --filter @devsync/api db:deploy`.

## Containers (wslc)

```powershell
wslc-compose build api web
wslc exec devsync-db-1 psql -U devsync -c "CREATE DATABASE IF NOT EXISTS ..."  # use CREATE DATABASE
wslc-compose up -d migrate   # one-shot
wslc-compose up -d api web   # api:3100, web:8080
```

Limits: no healthchecks; do not `down` the shared `db` volume while developing.

## Security reports

Open a private security advisory or email the maintainers — do not file public issues for vulnerabilities.
