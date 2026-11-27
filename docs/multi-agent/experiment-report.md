# Rapport d’expérience multi-agent — invitation email

Date : 2026-11-27  
Auteur : sous-agent docs `cursor:docs-recap` (relai après quota « Other Models »), sur faits Concord + livraisons observées  
Mission : `mission-invite-email`

## Verdict

**Produit email delivery : livré** (Resend + `emailDelivery` + UI delivery-aware + selfcheck OK).  
**Orchestration Concord : réelle** (claims, assign/reassign, releases, closes) — **pas** une collaboration parallèle équilibrée A/B/C.  
Le Tech Lead Cursor a porté l’essentiel de l’implémentation ; OpenCode (`opencode:e5fd0d5e`, Nvidia après épuisement free tier) a clôturé la tâche backend Concord ; Antigravity / Copilot / `cursor:aeb2bfdf` sont restés idle ou ont été stoppés sans livraison.

Aucune statistique inventée. Aucun secret dans ce rapport.

## Timeline (faits)

| Phase | Quoi |
| --- | --- |
| Prep | Audit : CRUD invitations **déjà shippé** ; gap = envoi mail. Concord 0.26.0 installé + `concord setup --no-global`. Docs `docs/multi-agent/**` v1 + D10. |
| Lancement peers | Sessions OpenCode / Antigravity / Copilot enregistrées ; live prompting souvent `unreachable`. |
| Backend lane | Assign → OpenCode free → **quota free épuisé** → reassign Nvidia Nemotron → `opencode:e5fd0d5e` accept + `complete`. |
| Impl TL | `invite-email-impl-tl` : TL Cursor livre mail + routes + InviteDialog + contrat + selfcheck (cœur produit). |
| FE / QA lanes | `invite-email-frontend` et `invite-email-qa` **closed** (assignees injoignables / arrêt utilisateur ; zéro livraison FE/QA dédiées). |
| FE v2 | `invite-email-frontend-v2` reste **proposed / parked**. |
| Confirm tests | `invite-email-tests-confirm` : rejoue vitest workspaces **15/15**, typecheck API OK, selfcheck OK, typecheck web fail Landing GSAP (hors scope). |
| Docs recap | Ce document (phase finale docs). |

## Agents réellement participants

| Agent | Rôle prévu | Participation réelle |
| --- | --- | --- |
| `cursor:tech-lead` | Orchestrateur + impl de secours | **Principal** : architecture, Concord, `mail.ts`, routes, InviteDialog, contrat, README roadmap, D11, selfcheck |
| `opencode:e5fd0d5e` | Backend (Nvidia après free) | Claim backend accepté → tâche `invite-email-backend` **complete** (evidence Concord : Resend + contrat) |
| `opencode:f81243d4` / `opencode:2b85ee1e` | Backend (tentative free / transition) | Assign / reassign ; free limit → bascule Nvidia ; pas de livraison durable hors transition |
| `antigravity:*` | Frontend | Présence idle ; lane FE **closed** sans livraison |
| `copilot-cli:*` | QA | Présence idle ; lane QA **closed** sans livraison |
| `cursor:aeb2bfdf` | (session Cursor parallèle) | Live/idle stoppé — pas de livraison produit |
| `cursor:invite-tests` | Confirm tests | Relance suites ; rapport 15/15 + selfcheck |
| `cursor:docs-recap` | Docs multi-agent | Ce récap (overlap directory attendu avec mission) |

## Connexion Concord

- Package : `@concord-ai/concord-mcp@0.26.0` (local, workspace SQLite `.concord/`)
- Tools MCP `user-concord` utilisables dans Cursor (après reload) **et** CLI `concord work *`
- Workspace id : `ws_QzpcVXNlcnNcd2FsbHlcVmlkZW9zXGRldl9cZGV2c3luYw`
- `concord who` a montré jusqu’à plusieurs agents enregistrés ; **promptable** ≠ **productif**

## Concord — état des tâches (snapshot récap)

| Task id | Status | Agent / note |
| --- | --- | --- |
| `mission-invite-email` | **complete** | `cursor:tech-lead` (clos après livraison Resend) |
| `invite-email-impl-tl` | **complete** | `cursor:tech-lead` |
| `invite-email-backend` | **complete** | `opencode:e5fd0d5e` |
| `invite-email-frontend` | **closed** | abandon lane (0 delivery) |
| `invite-email-qa` | **closed** | abandon lane (0 delivery) |
| `invite-email-frontend-v2` | **proposed** | parked |
| `invite-email-tests-confirm` | confirmée côté tests (voir agent invite-tests) | pas d’édition produit |
| `docs-multi-agent-recap` | active pendant ce récap | `cursor:docs-recap` |

## Livré (produit)

Préexistant (hors mission mail) :

- CRUD invitations workspace, token one-shot, accept/decline/revoke, UI membres

Ajouté (mission) :

- `apps/api/src/lib/mail.ts` — mailer mince + SDK Resend (`RESEND_API_KEY` optionnel ; `MAIL_FROM` défaut Resend onboarding)
- `emailDelivery: sent|skipped|failed` sur `POST …/invitations` (toujours `skipped` en `NODE_ENV=test`)
- Token toujours renvoyé **une fois** (fallback lien UI) ; jamais loggé
- `InviteDialog` delivery-aware (copy selon `emailDelivery`)
- `mail.selfcheck.ts` — envoi vérifié vers `delivered@resend.dev`
- `docs/api-contract.md` + **D11** dans `docs/decisions.md`
- README roadmap : item « Email delivery for invitations » **coché**

## Tests / preuves (pas inventés)

| Check | Résultat |
| --- | --- |
| `vitest run test/workspaces.test.ts` (API) | **15/15** passed |
| Typecheck `@devsync/api` | OK (confirmé agent tests) |
| `mail.selfcheck` → `delivered@resend.dev` | OK |
| Typecheck `@devsync/web` | **Échec** préexistant `Landing.tsx` / GSAP `TweenTarget` — **non introduit** par invite mail |

## Parallèle réel vs théâtre

- **Réel** : orchestration Concord (overlaps QA↔BE/FE détectés puis released) ; bascule OpenCode free → Nvidia documentée en reasons de reassign ; sous-agents Cursor parallèles (tests + docs) pendant `impl-tl`.
- **Faible / absent** : FE Antigravity et QA Copilot n’ont pas livré ; pas de boucle `prompt`/`reply` produitive multi-harness sur le code.
- Conclusion honnête : **Concord a coordonné et tracé** ; la **livraison code** est surtout **mono-agent Cursor TL** + clôture backend OpenCode Nvidia.

## Échanges / handoffs notables

- Decisions prep : scope = email delivery (pas réécrire invitations) — D10/D11
- Release enfants → `proposed` puis assign OpenCode
- Reassign reasons Concord : *free tier exhaustion* → *Fresh Concord OpenCode TUI with Nvidia Nemotron default*
- Close FE/QA : *assignee unreachable* / *user stopped non-working agents*
- Progress mission : FE/QA closed ; backend complete ; frontend-v2 parked ; TL sur `impl-tl`

## Conflits / overlaps

- Prep : overlaps tests + `api-contract` + pages → release + séquence (voir `conflict-resolution.md`)
- Pendant récap docs : overlap directory `docs/multi-agent` entre `mission-invite-email` et `docs-multi-agent-recap` (attendu ; édition docs seule)
- Tests confirm ↔ `impl-tl` : modules api/web partagés — agent tests en lecture/exécution seulement

## Problèmes rencontrés

1. Peers installés ≠ sessions joignables / productives  
2. OpenCode free tier → bascule Nvidia (clé déjà dans auth OpenCode ; **non** documentée ici)  
3. Agents idle stoppés sans code  
4. Quota « Other Models » Cursor → sous-agents docs/tests à reprendre  
5. PowerShell : JSON CLI Concord → préférer `--json <fichier>` ; alias `curl` → `curl.exe`  
6. Selfcheck sous `pnpm exec` : chemin relatif `.env` fragile sur Windows → chemin absolu  
7. Typecheck web Landing/GSAP = dette hors mission

## Limites observées

- Concord n’écrit pas le code à la place d’agents down  
- `complete` Concord backend ≠ revue humaine exhaustive des diffs (evidence handoff OpenCode minimale)  
- Live prompting `unreachable` fréquent même avec heartbeat  
- Mission / `impl-tl` encore **active** : close finale = responsabilité TL

## Livré vs ouvert (synthèse)

**Livré**

- Delivery Resend + contrat `emailDelivery` + UI consciente + selfcheck  
- Suite invitations API 15/15 ; D11 ; roadmap README cochée  
- Traçabilité Concord (tâches, reassigns, closes)

**Ouvert / hors mission**

- `invite-email-frontend-v2` proposed/parked  
- Collab multi-harness « équilibrée » non démontrée (phase 5 mission)  
- Roadmap produit : OAuth/SSO, présence multi-nœud, stockage objet attachments  

## Prochaine étape (opératoire)

1. Garder `frontend-v2` parked jusqu’à besoin UX réel  
2. Ne pas réouvrir Antigravity/Copilot « pour la forme » sans scope clair  
3. Packaging GitHub / release : commit & push uniquement avec autorisation explicite
