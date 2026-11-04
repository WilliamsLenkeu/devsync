# @devsync/mcp-server

MCP (Model Context Protocol) bridge between AI coding clients (Cursor, Claude Desktop, …) and the DevSync **agent REST API**. It exposes Kanban tools over stdio; it never talks to the database.

## Auth

1. In the DevSync web UI, open the workspace → **API tokens**.
2. Create a token with the scopes you need (prefix `dsk_…`). The secret is shown once.
3. Set `DEVSYNC_API_TOKEN` to that secret. The token is bound to **one workspace**; effective rights = **scopes ∩ owner's current role**.

| Env                 | Required | Default                 | Notes                     |
| ------------------- | -------- | ----------------------- | ------------------------- |
| `DEVSYNC_API_TOKEN` | yes      | —                       | Must start with `dsk_`    |
| `DEVSYNC_API_URL`   | no       | `http://localhost:3000` | Trailing slashes stripped |

Calls use `Authorization: Bearer <token>` against `{DEVSYNC_API_URL}/api/agent/*`. The token is never written to stdout/stderr or tool results.

## Tools

| Tool                   | Purpose                                  | Required scope    |
| ---------------------- | ---------------------------------------- | ----------------- |
| `list_workspaces`      | Confirm the workspace bound to the token | `workspaces:read` |
| `list_projects`        | List projects (+ task counts)            | `projects:read`   |
| `list_tasks`           | List/filter tasks of a project           | `tasks:read`      |
| `get_task`             | Fetch one task                           | `tasks:read`      |
| `create_task`          | Create a task                            | `tasks:write`     |
| `update_task`          | Patch fields; `status` moves the card    | `tasks:write`     |
| `assign_task`          | Assign / unassign (`assigneeId: null`)   | `tasks:write`     |
| `add_task_comment`     | Add a comment (marked as agent)          | `comments:write`  |
| `get_project_activity` | Paginated activity feed                  | `activity:read`   |

Contract: `docs/api-contract.md` (section **API agent**).

### Example agent flow (pick up a task)

`list_projects` → `list_tasks` → `update_task` with `status: "IN_PROGRESS"` → `add_task_comment`.

## Run

From the monorepo root (API must be reachable at `DEVSYNC_API_URL`):

```bash
pnpm --filter @devsync/mcp-server start
```

Stdout is the MCP JSON-RPC channel; human messages go to stderr (`devsync-mcp ready …`).

## Cursor

`.cursor/mcp.json` (repo or user config). Replace `C:/path/to/devsync` and the token:

```json
{
  "mcpServers": {
    "devsync": {
      "command": "pnpm",
      "args": ["--filter", "@devsync/mcp-server", "start"],
      "cwd": "C:/path/to/devsync",
      "env": {
        "DEVSYNC_API_URL": "http://localhost:3000",
        "DEVSYNC_API_TOKEN": "dsk_…"
      }
    }
  }
}
```

Alternative without `cwd` / filter:

```json
{
  "mcpServers": {
    "devsync": {
      "command": "npx",
      "args": ["tsx", "C:/path/to/devsync/apps/mcp-server/src/index.ts"],
      "env": {
        "DEVSYNC_API_URL": "http://localhost:3000",
        "DEVSYNC_API_TOKEN": "dsk_…"
      }
    }
  }
}
```

## Claude Desktop

`claude_desktop_config.json` (same shape under `mcpServers`):

```json
{
  "mcpServers": {
    "devsync": {
      "command": "pnpm",
      "args": ["--filter", "@devsync/mcp-server", "start"],
      "cwd": "C:/path/to/devsync",
      "env": {
        "DEVSYNC_API_URL": "http://localhost:3000",
        "DEVSYNC_API_TOKEN": "dsk_…"
      }
    }
  }
}
```

## Security

- Grant **least-privilege scopes** (read-only tokens for triage agents).
- Prefer a **short expiry**; revoke unused tokens in the UI.
- Store the secret in the client config / OS secret store — never commit it.
- This process only forwards scoped HTTP calls; the API enforces authz.

## Troubleshooting

| Symptom                                                        | Likely cause                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Process exits immediately, stderr mentions `DEVSYNC_API_TOKEN` | Env missing or not `dsk_…`                                  |
| Tool result `UNAUTHENTICATED` / 401                            | Wrong or revoked token                                      |
| Tool result `FORBIDDEN` / 403                                  | Missing scope or role too low (e.g. VIEWER + `tasks:write`) |
| `NOT_FOUND` / 404                                              | Bad id, or resource outside the token workspace             |
| `NETWORK_ERROR` / `TIMEOUT`                                    | API down, bad `DEVSYNC_API_URL`, firewall                   |

## MCP Inspector

Smoke-test tools without a full IDE:

```bash
npx @modelcontextprotocol/inspector pnpm --filter @devsync/mcp-server start
```

Set `DEVSYNC_API_TOKEN` (and optionally `DEVSYNC_API_URL`) in the Inspector env UI, then **Connect** → **Tools**.

## Dev

```bash
pnpm --filter @devsync/mcp-server typecheck
pnpm --filter @devsync/mcp-server test
```
