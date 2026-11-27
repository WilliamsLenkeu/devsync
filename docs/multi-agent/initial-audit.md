# Audit initial DevSync — multi-agent

Date : 2026-11-27  
Auditeur : Agent D (Tech Lead, Cursor)  
Git : `master` @ `3ebeb26`, working tree clean au début d’audit (puis fichiers Concord setup)

## 1. Monorepo

| Chemin | Rôle |
| --- | --- |
| `apps/api` | Fastify + Prisma 7 + PostgreSQL, REST + WS + `/api/agent/*` |
| `apps/web` | React 19 + Vite + Tailwind + shadcn/ui |
| `apps/mcp-server` | MCP stdio → client REST agent (`dsk_…`) |
| `packages/shared` | Rôles, `can()`, scopes tokens |

Workspace pnpm (`apps/*`, `packages/*`). Node ≥ 22 (local : **v24.16.0**), pnpm **11.9.0**.

## 2. Points d’entrée & scripts

Racine `package.json` : `dev:api`, `dev:web`, `build`, `typecheck`, `lint`, `test`, `db:up` / `db:down` (wslc-compose).

API : `src/server.ts` · Web : Vite `:5173` · MCP : `pnpm --filter @devsync/mcp-server start`.

## 3. État runtime (vérifié)

| Service | État |
| --- | --- |
| PostgreSQL (`devsync-db-1`, wslc) | Up, `127.0.0.1:5432` |
| API `GET /health` | **200** `{"status":"ok"}` |
| Web `:5173` | **200** |
| MCP unit tests | **21/21 passed** |
| Migration Prisma | `20261104212843_init` (seule) |

## 4. Fonctionnalités réellement implémentées

- Auth Argon2, cookies HTTP-only, refresh rotation (`apps/api/src/modules/auth`)
- Workspaces + rôles OWNER/ADMIN/MEMBER/VIEWER (`authorize` + `@devsync/shared`)
- Projets, Kanban DnD persistant, commentaires, mentions
- Notifications + WebSocket (`realtime`)
- Dashboard / activité
- API tokens + MCP (9 tools)
- **Invitations workspace (CRUD complet)** — voir §6

## 5. Tests

| Zone | Fichiers notables |
| --- | --- |
| API | `auth`, `workspaces` (dont **suite invitations**), `tasks`, `projects`, `comments`, `notifications`, `activities`, `agents`, `api-tokens`, `realtime`, `schema` |
| Web | Vitest pages/features + `AcceptInvitation.test.tsx` |
| MCP | `server`, `stdio`, `config` |
| E2E | `apps/web/e2e/smoke.spec.ts` (Playwright optionnel localement) |

## 6. Invitations — écart critique vs brief

Le brief « Workspace Email Invitations » décrit une feature **déjà livrée** dans le code et le contrat.

| Attendu brief | État réel |
| --- | --- |
| Création / token / expiration 7j | Oui (`routes.ts`, hash SHA-256) |
| Accept / decline / revoke | Oui |
| Anti-doublon PENDING | Oui (transaction + 409) |
| Permissions `member:invite` | Oui (ADMIN+) ; OWNER interdit à l’invite |
| Formulaire + rôle + liste pending | Oui (`InviteDialog`, `PendingInvitations`, `Members`) |
| Page acceptation token | Oui (`/invitations/accept`) |
| Tests automatisés | Oui (`describe('invitations')` dans `workspaces.test.ts`) |
| **Envoi email SMTP / transactionnel** | **Oui (post-mission)** — Resend ; voir D11 + `experiment-report.md` |

Au moment de l’audit (pré-mission) : pas d’envoi ; UI montrait le fallback lien one-time.  
**Décision Tech Lead (tenue) :** ne pas réimplémenter les invitations — livrer **Invitation email delivery**.

## 7. Incomplet / risques techniques

- Email invitations : **livré** (Resend) ; dettes annexes = typecheck Landing/GSAP, close mission TL
- Realtime multi-node (EventBus in-process)
- Pièces jointes / OAuth (roadmap)
- `ProjectMember` roster vs accès workspace large (décision D4)
- Pas de package mail existant

## 8. Git / remote

- Remote : `https://github.com/WilliamsLenkeu/devsync.git`
- 11 commits sur `master`
- Après `concord setup` : fichiers MCP/instructions non commités (`.cursor/`, `.mcp.json`, `CLAUDE.md`, patch `AGENTS.md`, etc.). `.concord/` ignoré localement.

## 9. Agents machine (aperçu)

Voir `concord-setup.md` et `agent-responsibilities.md`.

## 10. Conclusion audit

DevSync est un MVP fonctionnel cohérent. La priorité multi-agent n’est **pas** de reconstruire les invitations, mais (1) brancher Concord pour une collab observable, (2) livrer l’envoi d’emails d’invitation, (3) documenter handoffs/conflits avec preuves Concord.
