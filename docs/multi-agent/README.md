# Multi-agent — Concord

Documentation de l’expérience multi-agents sur DevSync (orchestration Concord MCP, mission invitations email).

| Fichier | Rôle |
| --- | --- |
| [initial-audit.md](./initial-audit.md) | Audit monorepo / écart invitations |
| [concord-setup.md](./concord-setup.md) | Installation et adaptateurs Concord |
| [agent-responsibilities.md](./agent-responsibilities.md) | Rôles A/B/C/D et périmètres |
| [coordination-workflow.md](./coordination-workflow.md) | Boucle 5 tools + plan mission |
| [conflict-resolution.md](./conflict-resolution.md) | Overlaps et règles de résolution |
| [handoff-examples.md](./handoff-examples.md) | Exemples de claims / handoffs |
| [experiment-report.md](./experiment-report.md) | Rapport final (faits, limites) |

**Note :** Concord orchestre le travail des agents locaux ; ce n’est **pas** le serveur MCP produit (`apps/mcp-server`), qui parle à l’API agent DevSync.
