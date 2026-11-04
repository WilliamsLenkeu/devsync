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
