# Responsabilités agents — équipe DevSync

## Rôles

| ID Concord prévu | Rôle | Outil | Statut observé (2026-11-27 post-impl) |
| --- | --- | --- | --- |
| `cursor:tech-lead` | Agent D — Tech Lead / Architecte / Orchestrateur | Cursor | **Principal livreur** + orchestrateur ; claims `mission-*` + `impl-tl` encore active |
| `opencode:*` (ex. `e5fd0d5e`) | Agent A — Backend Engineer | OpenCode (+ Nvidia après free) | Backend Concord **complete** ; sessions antérieures free/transition idle |
| `antigravity:*` | Agent B — Frontend Engineer | Antigravity IDE + `agy` | Présence idle ; lane FE **closed** sans code |
| `copilot-cli:*` | Agent C — QA & Security | GitHub Copilot CLI | Présence idle ; lane QA **closed** sans revue dédiée |

## Périmètres fichiers (claim Concord)

### Agent A — Backend (`invite-email-backend`)

- `apps/api/src/**` (mail port, hook post-création invitation)
- `apps/api/test/workspaces.test.ts` (extension email — **après** coordination avec QA)
- `.env.example`, `docs/api-contract.md` (champs réponse invite si besoin)
- **Interdit sans handoff :** UI React

### Agent B — Frontend (`invite-email-frontend`)

- `apps/web/src/features/members/**`
- `apps/web/src/pages/AcceptInvitation.tsx` (+ tests associés)
- **Attend le contrat API** publié par A via `update_work` (decision) avant d’intégrer
- **Interdit sans handoff :** Prisma, routes Fastify

### Agent C — QA (`invite-email-qa`)

- Revue diffs, permissions, absence de token en clair dans logs
- Exécution `pnpm --filter @devsync/api test`, typecheck ciblé
- Ne modifie le code produit qu’en correctifs de tests/régressions signalés
- **Overlap connu** avec A/B sur `workspaces.test.ts`, `api-contract.md`, `pages/` → séquencer après livraisons A puis B

### Agent D — Tech Lead (`mission-invite-email`)

- Architecture, tâches Concord, assignations, résolution overlaps, validation finale
- Doc `docs/multi-agent/**`
- Ne code le produit que si un agent est indisponible **et** après décision documentée

## Comment lancer chaque agent (mécanismes vérifiés)

### Cursor (D)

Déjà dans le repo. Après restart MCP :

- Tools Concord disponibles
- Monitor idle : `concord inbox watch --agent <id> --provider cursor --once` (une tâche Shell background)

### OpenCode (A)

```powershell
# 1. Démarrer OpenCode (UI ou service) pour sortir de action_required
opencode
# 2. Idéalement via adapter Concord
concord adapters opencode
# 3. Dans la session : start_work sur invite-email-backend
```

### Antigravity (B)

```powershell
agy --version   # 1.1.25
# Ouvrir le projet DevSync dans Antigravity IDE (MCP déjà écrit dans .agents/mcp_config.json)
# Session : start_work invite-email-frontend + inbox watch provider antigravity
```

Intervention manuelle probable : ouvrir le projet / accepter MCP.

### Copilot CLI (C)

```powershell
concord adapters copilot
# ou
copilot -p "…"   # hooks Concord partiels hors adapter
```

## Règle d’or

Un agent **n’est compatible Concord** que si `concord adapters status` le confirme **et** qu’une session a enregistré sa présence (`concord who`). Installation de l’app ≠ session joignable.
