# Procedures

## Database (wslc-compose)

| Action              | Command |
| ------------------- | ------- |
| Start               | `pnpm db:up` / `wslc-compose up -d db` |
| Stop (keep volume)  | `wslc-compose stop db` |
| Tear down + volume  | `wslc-compose down -v` — **destroys data** |
| Shell               | `wslc exec devsync-db-1 psql -U devsync` |
| Create test DB      | `wslc exec devsync-db-1 psql -U devsync -c 'CREATE DATABASE devsync_test'` |
| Dump                | `wslc exec -i devsync-db-1 pg_dump -U devsync devsync > backup.sql` |
| Restore             | `Get-Content backup.sql \| wslc exec -i devsync-db-1 psql -U devsync -d devsync` |

`wslc-compose` ignores healthchecks; the API retries DB connect 20×2s at boot.

## Migrations

```powershell
pnpm --filter @devsync/api db:migrate --name <name>   # invents + applies (dev)
pnpm --filter @devsync/api db:deploy                  # apply pending (CI / prod)
```

## JWT secret rotation

Changing `JWT_ACCESS_SECRET` invalidates every access token immediately. Refresh cookies still work until their family expires/revokes — users may get a brief 401 then a successful `/api/auth/refresh`. For a hard logout of everyone: truncate `Session` or bump and also revoke refresh tokens.

## Application stack (api + web containers)

Uses the same compose file; leave the existing `db` container alone.

```powershell
# once
wslc exec devsync-db-1 psql -U devsync -c "CREATE DATABASE devsync_stack"
# .env: JWT_ACCESS_SECRET, STACK_DB=devsync_stack, WEB_ORIGIN=http://localhost:8080

wslc-compose build api web
wslc-compose up migrate   # exit when done
wslc-compose up -d api web
# web http://localhost:8080  — /api proxied to api:3000 (incl. WebSocket)
wslc-compose stop api web
```

## Troubleshooting wslc

- `forwarding Ping: no such job` / `E_FAIL` during `wslc build` → restart WSL (`wsl --shutdown`) and retry; not a Dockerfile error.
- Port 5432 already taken → change `POSTGRES_PORT` in `.env`.
- Images: `wslc images` ; pull: `wslc pull node:24-alpine`.

## CI locally

Same sequence as `.github/workflows/ci.yml`: install → generate → migrate → typecheck → lint → prettier --check → test → build.
