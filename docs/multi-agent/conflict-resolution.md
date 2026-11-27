# Résolution de conflits / overlaps

## Mécanisme

`start_work` avec `expected_files` / modules croisés renvoie `overlaps[]`.  
`concord status` affiche **Potential overlaps**.  
`concord check <files>` pour hooks/CI.

## Incident réel (démo prep)

Lors du claim initial des 3 sous-tâches par `cursor:tech-lead` :

| Paire | Raison Concord |
| --- | --- |
| `invite-email-backend` ↔ `invite-email-qa` | mêmes fichiers : `apps/api/test/workspaces.test.ts`, `docs/api-contract.md` |
| `invite-email-frontend` ↔ `invite-email-qa` | même répertoire : `apps/web/src/pages` |

### Résolution appliquée

1. Enregistrer la décision de séquencement (QA après A et B).  
2. `transfer_work action=release` sur les 3 enfants → status `proposed`, plus d’owner concurrent.  
3. Mission parente reste claimée par le Tech Lead (orchestration only).  
4. Quand A démarre : claim `invite-email-backend` uniquement.  
5. B attend la decision « contrat API mail » avant `start_work` frontend.  
6. C claim QA seulement quand A+B sont `review_ready`.

### Suite observée (impl)

- FE et QA n’ont jamais atteint `review_ready` → tâches **closed** (assignees idle / arrêt utilisateur).
- Backend a suivi assign → reassign Nvidia → `complete` (`opencode:e5fd0d5e`).
- Impl produit portée surtout par `invite-email-impl-tl` (`cursor:tech-lead`) — overlaps directory docs traités en parallèle lecture/écriture docs seule.

## Règles projet

- Un seul agent claim un fichier « chaud » à la fois.  
- Fichiers partagés (`api-contract.md`, tests) : ownership explicite via handoff `offer`/`accept` ou séquence.  
- Si overlap imprévu : stop edit → `inspect_work` → message `prompt` → re-split claims.  
- Jamais deux agents sur `routes.ts` invitations en parallèle.
