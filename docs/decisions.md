# D√©cisions d'architecture

## D1 ‚Äî wslc-compose au lieu de Docker (2026-11-04)

Docker n'est pas install√© ; `wslc` (WSL Containers 3.0.3) l'est, avec `wslc-compose` (pip, 0.2.1) pour les fichiers compose.
Limites constat√©es : pas de healthcheck, `depends_on` retombe sur `started`. Le d√©marrage de l'API devra donc r√©essayer la connexion DB.
Image Postgres : `postgres:16-alpine` (d√©j√† pr√©sente localement).

## D2 ‚Äî Prisma 7.10 (pas 8 RC)

`prisma@latest` est une RC 8. Version 7.10.1 √©pingl√©e : g√©n√©rateur `prisma-client` (sortie `src/generated/prisma`, ignor√©e par git), URL dans `prisma.config.ts`, driver adapter `@prisma/adapter-pg`.

## D3 ‚Äî Pas de `packages/config`

Une seule `tsconfig.base.json` + `eslint.config.js` √† la racine suffisent. Un package de config partag√©e n'apporterait rien (YAGNI).

## D4 ‚Äî Mod√®le d'acc√®s

- Autorisation au niveau **workspace** (OWNER > ADMIN > MEMBER > VIEWER), table d'actions dans `@devsync/shared`.
- Tous les membres du workspace voient tous les projets ; `ProjectMember` est le roster : un assign√© doit en faire partie.
- Token API = (utilisateur, workspace, scopes). Droits effectifs = scopes ‚à© r√¥le courant de l'utilisateur.

## D5 ‚Äî Sch√©ma

- IDs UUID v7 (triables par date).
- `Project.taskCounter` incr√©ment√© atomiquement en transaction ‚Üí identifiants `WEB-12`.
- `Task.position` en `Float` (insertion par milieu) ; r√©√©quilibrage si l'√©cart devient trop petit (ponytail : suffisant pour des colonnes < quelques milliers de t√¢ches).
- `Session` : une ligne par refresh token, `familyId` pour d√©tecter la r√©utilisation d'un token d√©j√† rot√©.
- Pas d'unicit√© partielle des invitations PENDING en base (non exprimable dans Prisma) : v√©rifi√©e en transaction c√¥t√© service.

## D6 ó Backend (phase 2)

- RÈponses : succËs `{ data }`, erreurs `{ error: { code, message, details? } }` ; handlers d'erreur posÈs AVANT l'enregistrement des modules (un `register` attendu copie les handlers dans le scope enfant).
- Authz unique : `authorize()` (non-membre ? 404, rÙle insuffisant ? 403, token ? scope + workspace). Le service `modules/tasks/service.ts` est partagÈ par les routes web et `/agent/*`.
- Dernier OWNER protÈgÈ (409) ; un ADMIN ne peut pas toucher un OWNER (403). Invitation expirÈe/dÈj‡ traitÈe ? 409, mauvais email ? 403.
- AssignÈ non membre du projet ? 400. `TASK_DELETED` n'a pas de `taskId` (sinon supprimÈ en cascade avec la t‚che).
- `Task.position` : Float, pas de 1024, insertion au milieu, rÈÈquilibrage si Ècart < 1e-6.
- Dashboard : uniquement les projets ACTIVE ; `inProgress` = statut IN_PROGRESS seul.
- Tokens API : `token:manage` exige MEMBER, donc un VIEWER ne peut pas crÈer de token. …vÈnements ‡ `audience` (notifications) livrÈs sans revÈrification d'appartenance (ponytail : une notification Èmise juste avant un retrait peut encore arriver).
- Refresh token : rotation, rÈutilisation d'un token dÈj‡ rotÈ ? rÈvocation de toute la famille.


## D7 ó Conteneurs / CI (2026-11-04)

- Build API : esbuild bundle ESM (dist/server.js), deps natives/runtime externalisÈes (@prisma/*, rgon2, pg, FastifyÖ). @devsync/shared est bundlÈ.
- Dockerfiles multi-stage, contexte = racine monorepo. Compose : services migrate (one-shot), pi, web en plus de db ; ports host 3100/8080 pour ne pas croiser le dev Vite. Pas de healthcheck (wslc).
- CI GitHub Actions : Postgres service, typecheck/lint/prettier/test/build + jobs images Docker et e2e conditionnel (si playwright.config.ts).

