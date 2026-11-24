# AGENTS.md — DevSync

Plateforme de collaboration pour équipes de dev (Kanban, temps réel, API + MCP pour agents IA).

## Structure

- `apps/api` — Fastify + Prisma (PostgreSQL), REST + WebSocket + agent API
- `apps/web` — React + Vite + shadcn/ui (SPA, proxy `/api` en dev)
- `apps/mcp-server` — serveur MCP stdio (client REST de l'agent API) — voir son README
- `packages/shared` — enums, `can()` / rôles, scopes de tokens (source unique API/UI)
- `docs/api-contract.md` — contrat HTTP / WS (source de vérité)
- `docs/decisions.md`, `docs/procedures.md`

## Commandes

| Action | Commande |
| --- | --- |
| Installer | `pnpm install` |
| DB (wslc-compose) | `pnpm db:up` / `pnpm db:down` |
| Migrer / seed | `pnpm --filter @devsync/api db:migrate` / `db:seed` |
| Dev API / web | `pnpm --filter @devsync/api dev` · `pnpm --filter @devsync/web dev` |
| MCP | `pnpm --filter @devsync/mcp-server start` (env `DEVSYNC_API_TOKEN`) |
| Checks | `pnpm typecheck` · `pnpm lint` · `pnpm test` |
| Build | `pnpm --filter @devsync/api build` · `pnpm --filter @devsync/web build` |

## Conventions

- pnpm obligatoire, TypeScript strict, ESM.
- Conteneurs : **wslc** + `wslc-compose` (pas Docker sur cette machine). Pas de healthcheck.
- Authz backend via `authorize()` / `can()` — jamais « cacher le bouton » seulement.
- Formes API : `docs/api-contract.md`. Décisions : `docs/decisions.md`.
- Démo seed : `ada@devsync.dev` / `lin@devsync.dev` (mdp `DEMO_PASSWORD` ou `devsync-demo-123`).

<!-- antislop:start -->
## antislop

Direction : `DESIGN.md` à la racine (source d’identité). Filtre anti-slop pour toute UI / copy / a11y / mobile / commentaires.

Skills (machine locale) :
- Core : `~/.claude/skills/antislop/SKILL.md`
- UI : `~/.claude/skills/antislop-ui/SKILL.md`
- Copy : `~/.claude/skills/antislop-copywriting/SKILL.md`
- People : `~/.claude/skills/antislop-human/SKILL.md`
- Mobile : `~/.claude/skills/antislop-layoutmobile/SKILL.md`
- Comments : `~/.claude/skills/antislop-code/SKILL.md`

Mode projet : **pendant** le travail (appliquer en écrivant). Ne pas livrer une UI “draft without direction”.
<!-- antislop:end -->
