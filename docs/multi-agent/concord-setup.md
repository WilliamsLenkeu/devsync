# Concord setup — DevSync

Date : 2026-11-27  
Package officiel : `@concord-ai/concord-mcp` (**0.26.0**) — pas le package npm ambigu `concord-mcp@0.7.0` (autre auteur).

Docs : https://getconcord.ai/docs/concord-mcp · https://getconcord.ai/docs/agents · https://github.com/Get-Concord-AI/concord-mcp

## Prérequis

| Check | Résultat |
| --- | --- |
| Node.js | v24.16.0 (≥ 22.12 requis) |
| pnpm | 11.9.0 |
| Concord avant setup | Absent (pas dans PATH, pas dans `~/.cursor/mcp.json`) |

## Installation effectuée

```powershell
npm install -g @concord-ai/concord-mcp@latest
concord --version   # 0.26.0
```

Binaires : `concord`, `concord-mcp` sous `%AppData%\Roaming\npm\`.

Télémétrie : désactivable via `CONCORD_TELEMETRY_DISABLED=1` (utilisé pendant l’orchestration CLI).

## Setup dépôt

```powershell
cd C:\Users\wally\Videos\dev_\devsync
concord setup --no-global
```

Résultat :

- Workspace id : `ws_QzpcVXNlcnNcd2FsbHlcVmlkZW9zXGRldl9cZGV2c3luYw`
- État local : `.concord/` (SQLite schema v20, gitignored)
- MCP projet : `.cursor/mcp.json` → `command: concord-mcp`, `CONCORD_AGENT_KIND=cursor`
- Instructions : bloc `<!-- concord:start -->` dans `AGENTS.md`, plus `.cursor/rules/concord.mdc`, configs agents divers

`concord doctor` : workspace ok, store local, `concord.db` ok.

## Adaptateurs (`concord adapters status`)

| Harness | État | Capacités notables |
| --- | --- | --- |
| Cursor | installed | pull, steer, idle, busy, monitor-command |
| Antigravity | installed | pull, steer, idle, busy, monitor-command |
| Copilot CLI | installed | pull, inject, steer, idle, busy (idéalement via `concord adapters copilot`) |
| OpenCode | utilisé en session | backend lane acceptée / complete (`opencode:e5fd0d5e`) après bascule Nvidia |
| Claude Code | installed | (présent machine, hors équipe brief) |
| Codex / Gemini / Grok / Goose / Hermes / Devin / DeepSeek | not_detected | — |

État adapters au setup initial : OpenCode était `action_required` (service non démarré) — résolu une fois OpenCode lancé.

## Mécanismes de coordination réels

1. **MCP tools** (clients qui chargent `concord-mcp`) : `start_work`, `inspect_work`, `update_work`, `transfer_work`, `finish_work`
2. **CLI équivalente** : `concord work start|inspect|update|transfer|finish --agent <id> --json <file>` (préférer un fichier JSON sous PowerShell)
3. **Observation** : `concord status`, `who`, `tasks`, `messages`, `dashboard`, `check`
4. **Wake idle** : moniteurs `concord inbox watch --agent <id> --provider <harness> --once`
5. **Launchers** : `concord adapters copilot`, `concord adapters opencode`, …

## Post-mission

MCP Concord opérationnel dans Cursor (`user-concord`). Peers ont eu des heartbeats ; FE/QA non productifs. Voir `experiment-report.md` pour livré vs ouvert.