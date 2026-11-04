# AGENTS.md — DevSync

Plateforme de collaboration pour équipes de dev (tâches Kanban, temps réel, API + MCP pour agents IA).

## Structure

- `apps/api` — Fastify + Prisma (PostgreSQL), REST + WebSocket
- `apps/web` — React + Vite (phase 3)
- `apps/mcp-server` — serveur MCP (phase 5)
- `packages/shared` — enums, politique de rôles, scopes de tokens (source unique API/UI)

## Commandes

| Action                  | Commande                                      |
| ----------------------- | --------------------------------------------- |
| Installer               | `pnpm install`                                |
| DB (wslc-compose)       | `pnpm db:up` / `pnpm db:down`                 |
| Migrer                  | `pnpm --filter @devsync/api db:migrate`       |
| Typecheck / lint / test | `pnpm typecheck` / `pnpm lint` / `pnpm test`  |

## Conventions

- pnpm obligatoire, TypeScript strict, ESM.
- Conteneurs : **wslc** (WSL Containers) via `wslc-compose` à la place de Docker. Pas de healthcheck ni de `depends_on: service_healthy` (non supportés).
- Autorisation côté backend uniquement via `can()` de `@devsync/shared`.
- Tests DB : `DATABASE_URL` requis, sinon les tests concernés sont ignorés.
- Chaque décision significative → `docs/decisions.md`.
