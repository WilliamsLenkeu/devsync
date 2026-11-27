# Décisions d'architecture

## D1 — wslc-compose au lieu de Docker (2026-11-04)

Docker n'est pas installé ; `wslc` (WSL Containers 3.0.3) l'est, avec `wslc-compose` (pip, 0.2.1) pour les fichiers compose.
Limites constatées : pas de healthcheck, `depends_on` retombe sur `started`. Le démarrage de l'API devra donc réessayer la connexion DB.
Image Postgres : `postgres:16-alpine` (déjà présente localement).

## D2 — Prisma 7.10 (pas 8 RC)

`prisma@latest` est une RC 8. Version 7.10.1 épinglée : générateur `prisma-client` (sortie `src/generated/prisma`, ignorée par git), URL dans `prisma.config.ts`, driver adapter `@prisma/adapter-pg`.

## D3 — Pas de `packages/config`

Une seule `tsconfig.base.json` + `eslint.config.js` à la racine suffisent. Un package de config partagée n'apporterait rien (YAGNI).

## D4 — Modèle d'accès

- Autorisation au niveau **workspace** (OWNER > ADMIN > MEMBER > VIEWER), table d'actions dans `@devsync/shared`.
- Tous les membres du workspace voient tous les projets ; `ProjectMember` est le roster : un assigné doit en faire partie.
- Token API = (utilisateur, workspace, scopes). Droits effectifs = scopes ∩ rôle courant de l'utilisateur.

## D5 — Schéma

- IDs UUID v7 (triables par date).
- `Project.taskCounter` incrémenté atomiquement en transaction → identifiants `WEB-12`.
- `Task.position` en `Float` (insertion par milieu) ; rééquilibrage si l'écart devient trop petit (ponytail : suffisant pour des colonnes < quelques milliers de tâches).
- `Session` : une ligne par refresh token, `familyId` pour détecter la réutilisation d'un token déjà roté.
- Pas d'unicité partielle des invitations PENDING en base (non exprimable dans Prisma) : vérifiée en transaction côté service.

## D6 � Backend (phase 2)

- R�ponses : succ�s `{ data }`, erreurs `{ error: { code, message, details? } }` ; handlers d'erreur pos�s AVANT l'enregistrement des modules (un `register` attendu copie les handlers dans le scope enfant).
- Authz unique : `authorize()` (non-membre ? 404, r�le insuffisant ? 403, token ? scope + workspace). Le service `modules/tasks/service.ts` est partag� par les routes web et `/agent/*`.
- Dernier OWNER prot�g� (409) ; un ADMIN ne peut pas toucher un OWNER (403). Invitation expir�e/d�j� trait�e ? 409, mauvais email ? 403.
- Assign� non membre du projet ? 400. `TASK_DELETED` n'a pas de `taskId` (sinon supprim� en cascade avec la t�che).
- `Task.position` : Float, pas de 1024, insertion au milieu, r��quilibrage si �cart < 1e-6.
- Dashboard : uniquement les projets ACTIVE ; `inProgress` = statut IN_PROGRESS seul.
- Tokens API : `token:manage` exige MEMBER, donc un VIEWER ne peut pas cr�er de token. �v�nements � `audience` (notifications) livr�s sans rev�rification d'appartenance (ponytail : une notification �mise juste avant un retrait peut encore arriver).
- Refresh token : rotation, r�utilisation d'un token d�j� rot� ? r�vocation de toute la famille.


## D7 — Conteneurs / CI (2026-11-04)

- Build API : esbuild bundle ESM (dist/server.js), deps natives/runtime externalisées (@prisma/*, argon2, pg, Fastify…). @devsync/shared est bundlé.
- Dockerfiles multi-stage, contexte = racine monorepo. Compose : services migrate (one-shot), api, web en plus de db ; ports host 3100/8080 pour ne pas croiser le dev Vite. Pas de healthcheck (wslc).
- CI GitHub Actions : Postgres service, typecheck/lint/prettier/test/build + jobs images Docker et e2e conditionnel (si playwright.config.ts).

## D8 — MCP server = client REST agent (2026-11-04)

- `apps/mcp-server` est un processus stdio indépendant : 9 tools MCP → `Authorization: Bearer dsk_…` sur `/api/agent/*`. Pas d'accès DB, pas de ré-implémentation d'authz (scopes ∩ rôle déjà côté API).
- `TASK_STATUSES` / `TASK_PRIORITIES` dupliqués localement (`src/constants.ts`) tant que `@devsync/shared` n'est pas une dépendance du package.

## D9 — Direction UI (2026-11-05)

- v1 atelier/paper et v2 lime-console rejetées (stérile / trop gadget).
- **v3** (recherche Linear/Plane density + landing scroll demos 2025/26) : dark dense hairlines, accent cuivre, Bricolage Grotesque, landing = **reel pin/scrub GSAP** avec screenshots réels (`/screenshots`).
- App ENERGY 2 ; landing ENERGY/MOTION 3. MCP secondaire.

## D10 — Orchestration multi-agents Concord + scope invitations (2026-11-27)

- Coordination inter-agents via `@concord-ai/concord-mcp` (local `.concord/`), pas via chats isolés.
- Les invitations workspace (CRUD, token, accept/decline/revoke, UI) sont déjà livrées ; le gap roadmap est l’**envoi email**. Première mission collaborative = delivery mail, pas une réécriture des invitations.
- Détail opératoire : `docs/multi-agent/`.

## D11 — Invitation email via Resend (2026-11-27)

- `apps/api/src/lib/mail.ts` : Mailer mince + SDK `resend`. `RESEND_API_KEY` optionnel ; `MAIL_FROM` défaut `DevSync <onboarding@resend.dev>`.
- `POST …/invitations` renvoie `emailDelivery: sent|skipped|failed` ; token toujours renvoyé une fois (fallback UI). En `NODE_ENV=test` → toujours `skipped`.
- Le token n’est jamais loggé ; seuls des warn sans URL/token en cas d’échec Resend.
- Pas d’endpoint « resend email » : le token en clair n’est plus disponible après création (seul le hash est stocké).

## D12 — Realtime multi-nœud via Redis pub/sub (2026-11-27)

- `EventBus` : `LocalEventBus` (défaut) ou `RedisEventBus` si `REDIS_URL` est défini (canal `devsync:events`).
- Chaque nœud publie ses events avec `origin` ; les messages locaux ne sont pas rejoués (évite les boucles).
- Présence WebSocket reste **in-process par nœud** (pas partagée Redis) — documenté ; suffisant pour fan-out des événements métier.
- Compose : service `redis` sous profile `realtime` (optionnel).

## D13 — Pièces jointes tâches (2026-11-27)

- Modèle `TaskAttachment` (optionnellement lié à un `TaskComment`) ; blobs sur disque sous `ATTACHMENTS_DIR` (défaut `.data/attachments`).
- Limite `ATTACHMENTS_MAX_BYTES` (défaut 10 MiB) ; allowlist MIME (png/jpeg/webp/gif/pdf/text/markdown).
- Upload multipart `POST /api/tasks/:taskId/attachments` (champ `file`) ; events `attachment.created|deleted`.
- Pas de stockage objet cloud dans cette itération (local disk ; swap S3 derrière la même clé `storageKey` plus tard).

