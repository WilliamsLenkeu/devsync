# Changelog

All notable changes to DevSync are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-11-27

### Added

- Milk Desk UI direction (Odoo-inspired teal `#017E84`, Inter typography)
- Task file attachments API (local disk, MIME allowlist, size cap)
- Optional Redis pub/sub fan-out for multi-node realtime (`REDIS_URL`)
- Fresh product screenshots under `docs/screenshots/`
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, docs index

### Changed

- Sidebar: soft collapse, no “Active projects” list
- Project list as card grid; project overview KPIs / recent tasks / workload
- README refreshed for public GitHub offer packaging

### Fixed

- Vite dev proxy target restored to `http://localhost:3000` (default `API_PORT`)

## [0.1.0] — 2026-11-24

### Added

- Monorepo: Fastify API, React/Vite web, MCP server, shared package
- Auth (cookies), workspaces, projects, Kanban, members, invitations
- Agent REST API + scoped tokens (`dsk_…`)
- CI workflow (typecheck, lint, prettier, tests, Docker image builds)
- MIT license, CONTRIBUTING, issue/PR templates

[0.2.0]: https://github.com/WilliamsLenkeu/devsync/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/WilliamsLenkeu/devsync/releases/tag/v0.1.0
