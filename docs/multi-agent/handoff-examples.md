# Exemples de handoff (Concord)

Exemples **réels** produits pendant la phase prep + modèles pour la suite. Les payloads JSON sont ceux acceptés par `concord work * --json`.

## 1. Claim mission (réel)

```json
{
  "agent_id": "cursor:tech-lead",
  "kind": "cursor",
  "task_id": "mission-invite-email",
  "title": "MISSION: Invitation email delivery",
  "summary": "Gap after existing invite CRUD/UI: SMTP or transactional email",
  "expected_files": ["docs/multi-agent/", "apps/api/src/", "apps/web/src/features/members/"],
  "modules": ["docs", "orchestration"]
}
```

Résultat : `status: active`, `overlaps: []`.

## 2. Decision durable (réel)

```json
{
  "agent_id": "cursor:tech-lead",
  "task_id": "mission-invite-email",
  "kind": "decision",
  "content": "INVITE CRUD/UI ALREADY SHIPPED … Mission scope = mail abstraction + send on invite + UI …"
}
```

Lisible ensuite via `concord work inspect --task mission-invite-email` / artifacts `.concord/`.

## 3. Release pour assignation future (réel)

```json
{
  "agent_id": "cursor:tech-lead",
  "task_id": "invite-email-backend",
  "action": "release",
  "expected_version": 1
}
```

Résultat observé : `status: proposed`, `version: 2`, `agent_id: null`.

## 4. Modèle — assignation vers OpenCode (à exécuter quand A est online)

```json
{
  "agent_id": "cursor:tech-lead",
  "task_id": "invite-email-backend",
  "action": "assign",
  "to_agent_id": "opencode:backend",
  "expected_version": 2
}
```

Puis côté A : `start_work` / `transfer accept` selon le state machine Concord de la version en cours.

## 5. Modèle — publication contrat API (A → B)

```json
{
  "agent_id": "opencode:backend",
  "operation": "prompt",
  "task_id": "invite-email-backend",
  "to_agent_id": "antigravity:frontend",
  "content": "CONTRACT: POST invitations response adds emailDelivery: 'sent'|'skipped'|'failed'. Token still returned once for fallback link. No SMTP secrets in API body."
}
```

(Exact field names for `prompt` : valider via schéma MCP / `concord work update --help` + docs tools au moment de l’envoi — ne pas inventer si le schéma diverge.)

## 6. Modèle — finish review_ready

`finish_work` avec `outcome: review_ready`, liste `changed_files`, `tests_run`, risques.  
Tech Lead inspecte puis demande à QA, ou marque `complete` après QA.

## 7. Reassign réel (free → Nvidia OpenCode)

```json
{
  "agent_id": "cursor:tech-lead",
  "task_id": "invite-email-backend",
  "action": "assign",
  "to_agent_id": "opencode:e5fd0d5e",
  "expected_version": 4,
  "reason": "Fresh Concord OpenCode TUI with Nvidia Nemotron default"
}
```

Puis accept + close `complete` par `opencode:e5fd0d5e` (what_changed : Resend + contrat API).

## 8. Close réel FE (zéro livraison)

```json
{
  "agent_id": "cursor:tech-lead",
  "task_id": "invite-email-frontend",
  "outcome": "closed",
  "reason": "User stopped non-working agents",
  "what_changed": "Cancelled by user; Antigravity lane abandoned with zero delivery",
  "next_steps": ["invite-email-frontend-v2 when a working FE agent is available"]
}
```

## Preuve observation

```powershell
concord tasks
concord status
concord who
```

Post-impl : `invite-email-backend` complete ; FE/QA closed ; `frontend-v2` proposed ; `mission-invite-email` + `invite-email-impl-tl` encore active sous `cursor:tech-lead`. Détail : `experiment-report.md`.
