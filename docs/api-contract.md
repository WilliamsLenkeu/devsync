# Contrat d'API DevSync (source de vérité API ⇄ web ⇄ MCP)

Base : `/api`. JSON. Succès : `{ "data": … }` (listes paginées : `{ "data": [...], "nextCursor": string|null }`, query `limit` (1-100, défaut 30) + `cursor`).
Erreur : `{ "error": { "code", "message", "details?" } }` — codes : `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL` 500.
Auth web : cookies HTTP-only `ds_access` (JWT 15 min) + `ds_refresh` (rotation, path `/api/auth`). Le client appelle `POST /api/auth/refresh` sur 401 puis rejoue UNE fois.
Auth agent : `Authorization: Bearer dsk_…` uniquement sur `/api/agent/*`.
Non-membre d'un workspace → 404 ; membre sans le rôle → 403 (voir `src/authz.ts`).
Dates : ISO-8601. IDs : UUID. Les mutations renvoient la ressource à jour.

## Formes de ressources

```
UserRef      { id, name, avatarUrl|null }
User         { id, email, name, avatarUrl|null, createdAt }
Workspace    { id, name, slug, description|null, role (mon rôle), memberCount, createdAt, updatedAt }
Member       { userId, role, joinedAt, user: { id, name, email, avatarUrl|null } }
Invitation   { id, workspaceId, workspaceName, email, role, status, invitedBy: UserRef, expiresAt, createdAt }
Project      { id, workspaceId, name, description|null, identifier, status ACTIVE|ARCHIVED, taskCounts: { total, done }, createdAt, updatedAt }
Task         { id, projectId, number, key ("WEB-12"), title, description|null, status, priority, position, dueDate|null,
               assignee: UserRef|null, reporter: UserRef, labels: [{ id, name, color }], commentCount, createdAt, updatedAt }
Comment      { id, taskId, body, author: UserRef, createdAt, updatedAt }
Activity     { id, type, workspaceId, projectId|null, taskId|null, actor: UserRef|null, viaAgent: boolean, data, createdAt }
Notification { id, type, workspaceId, data, readAt|null, createdAt }
ApiToken     { id, workspaceId, name, prefix, scopes[], expiresAt|null, lastUsedAt|null, revokedAt|null, createdAt }
```

Statuts tâche : `BACKLOG TODO IN_PROGRESS IN_REVIEW DONE`. Priorités : `LOW MEDIUM HIGH URGENT`. Rôles : `OWNER ADMIN MEMBER VIEWER`.

### `data` des activités (snapshot, survit aux suppressions)

| type                                      | data                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------- |
| PROJECT_CREATED / UPDATED / ARCHIVED      | `{ name, identifier }`                                               |
| TASK_CREATED                              | `{ taskKey, title }`                                                 |
| TASK_UPDATED                              | `{ taskKey, title, changes: { <champ>: { from, to } } }`             |
| TASK_STATUS_CHANGED                       | `{ taskKey, title, from, to }`                                       |
| TASK_ASSIGNED                             | `{ taskKey, title, assignee: UserRef\|null }`                        |
| TASK_DELETED                              | `{ taskKey, title }`                                                 |
| COMMENT_CREATED                           | `{ taskKey, title, commentId, excerpt }` (excerpt ≤ 140 car.)        |
| MEMBER_JOINED                             | `{ user: UserRef, role }`                                            |
| MEMBER_REMOVED                            | `{ user: UserRef }`                                                  |
| MEMBER_ROLE_CHANGED                       | `{ user: UserRef, from, to }`                                        |

### `data` des notifications

| type                 | data                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| TASK_ASSIGNED        | `{ taskId, taskKey, title, projectId, actor: UserRef }`                  |
| COMMENT_MENTION      | `{ taskId, taskKey, title, projectId, commentId, actor: UserRef }`       |
| WORKSPACE_INVITATION | `{ invitationId, workspaceName, role, invitedBy: UserRef }`              |
| TASK_UPDATED         | `{ taskId, taskKey, title, projectId, actor: UserRef, from, to }` (changement de statut d'une tâche qu'on a créée/qui nous est assignée, fait par quelqu'un d'autre) |

Jamais de notification à soi-même. Mentions dans un commentaire : `@[Nom](user:<uuid>)` ; seuls les membres du workspace sont notifiés.

## Routes web (cookie)

### Auth / utilisateur (FAIT — `modules/auth`, `modules/users`)
`POST /auth/register {email,name,password}` 201 · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` 204 · `GET /auth/me` → `{data:{user}}`
`PATCH /users/me {name?,avatarUrl?}` · `POST /users/me/password {currentPassword,newPassword}` 204

### Workspaces, membres, invitations (`modules/workspaces`)
| Route | Rôle min. | Notes |
| --- | --- | --- |
| `GET /workspaces` | — | mes workspaces (Workspace[]) |
| `POST /workspaces {name,slug?,description?}` 201 | — | slug auto depuis le nom si absent, unique (409) ; le créateur est OWNER |
| `GET /workspaces/:workspaceId` | VIEWER | |
| `PATCH /workspaces/:workspaceId {name?,description?}` | ADMIN | |
| `DELETE /workspaces/:workspaceId` 204 | OWNER | |
| `GET /workspaces/:workspaceId/members` | VIEWER | Member[] |
| `PATCH /workspaces/:workspaceId/members/:userId {role}` | ADMIN | interdit de changer/créer un OWNER sauf si l'acteur est OWNER ; le dernier OWNER ne peut pas être rétrogradé |
| `DELETE /workspaces/:workspaceId/members/:userId` 204 | ADMIN, ou soi-même (quitter) | le dernier OWNER ne peut pas partir ; retire aussi ses ProjectMember et désassigne ses tâches du workspace |
| `GET /workspaces/:workspaceId/invitations` | ADMIN | PENDING seulement |
| `POST /workspaces/:workspaceId/invitations {email,role}` 201 | ADMIN | rôle OWNER interdit ; 409 si déjà membre ou invitation PENDING ; renvoie `{data:{invitation, token}}` — `token` en clair UNE seule fois (pas de SMTP : le lien `/invitations/accept?token=` est affiché à l'admin) ; expire après 7 j ; notification WORKSPACE_INVITATION si l'email correspond à un utilisateur |
| `DELETE /workspaces/:workspaceId/invitations/:invitationId` 204 | ADMIN | → REVOKED |
| `GET /invitations` | — | invitations PENDING non expirées adressées à MON email |
| `POST /invitations/:invitationId/accept` · `/decline` | — | l'email de l'invitation doit être le mien ; accept crée le WorkspaceMember (transaction), activité MEMBER_JOINED, event `member.joined` |
| `POST /invitations/accept {token}` | — | accepte par jeton (même vérification d'email) ; renvoie le Workspace |

### Projets (`modules/projects`)
| Route | Rôle min. | Notes |
| --- | --- | --- |
| `GET /workspaces/:workspaceId/projects?status=ACTIVE\|ARCHIVED` | VIEWER | défaut : tous |
| `POST /workspaces/:workspaceId/projects {name,identifier,description?}` 201 | MEMBER | identifier `^[A-Z][A-Z0-9]{1,5}$` unique par workspace (409) ; créateur ajouté ProjectMember ; activité PROJECT_CREATED ; event `project.created` |
| `GET /projects/:projectId` | VIEWER | |
| `PATCH /projects/:projectId {name?,description?,status?}` | ADMIN | `status` ARCHIVED → activité PROJECT_ARCHIVED ; `identifier` immuable ; un projet archivé refuse la création/modification de tâches (409) |
| `GET /projects/:projectId/members` | VIEWER | Member-like `{userId, createdAt, user}` |
| `POST /projects/:projectId/members {userId}` 201 | ADMIN | l'utilisateur doit être membre du workspace |
| `DELETE /projects/:projectId/members/:userId` 204 | ADMIN | désassigne ses tâches du projet |

### Tâches (`modules/tasks`)
| Route | Rôle min. | Notes |
| --- | --- | --- |
| `GET /projects/:projectId/tasks?status&priority&assigneeId&label&q&sort=position\|createdAt\|updatedAt\|dueDate\|priority&order=asc\|desc` | VIEWER | non paginé (board complet, ≤ 500) ; `q` = recherche insensible à la casse sur titre/description/clé ; `assigneeId=me` accepté ; `assigneeId=none` = non assignées |
| `POST /projects/:projectId/tasks {title,description?,status?,priority?,assigneeId?,dueDate?,labels?: [{name,color?}]}` 201 | MEMBER | `number` alloué atomiquement via `Project.taskCounter` ; position = fin de colonne ; assigné doit être ProjectMember ; activité TASK_CREATED (+TASK_ASSIGNED, notif) ; events `task.created` (+`task.assigned`) |
| `GET /tasks/:taskId` | VIEWER | |
| `PATCH /tasks/:taskId {title?,description?,priority?,assigneeId?|null,dueDate?|null,labels?}` | MEMBER | un seul PATCH peut changer plusieurs champs ; activités TASK_UPDATED / TASK_ASSIGNED ; events `task.updated` / `task.assigned` ; `labels` remplace l'ensemble |
| `POST /tasks/:taskId/move {status, beforeTaskId?: uuid\|null}` | MEMBER | déplacement Kanban : place la tâche dans la colonne `status` avant `beforeTaskId` (null/absent = fin) ; position = milieu des voisins (Float) ; rééquilibrage de la colonne si écart < 1e-6 ; activité TASK_STATUS_CHANGED si le statut change ; event `task.status_changed` ; notif TASK_UPDATED |
| `DELETE /tasks/:taskId` 204 | MEMBER (auteur/assigné) ou ADMIN | activité TASK_DELETED ; event `task.deleted` |
| `GET /tasks/:taskId/comments` | VIEWER | Comment[] ordre chronologique |
| `POST /tasks/:taskId/comments {body}` 201 | MEMBER | body 1-5000 car. ; mentions ; notifs COMMENT_MENTION ; activité COMMENT_CREATED ; event `comment.created` |
| `DELETE /comments/:commentId` 204 | auteur ou ADMIN | |
| `GET /tasks/:taskId/activity` | VIEWER | paginé |

### Activité, dashboard (`modules/activities`)
`GET /workspaces/:workspaceId/activity?projectId&taskId&cursor&limit` (VIEWER) · `GET /projects/:projectId/activity` (VIEWER) → Activity[] paginé, plus récent d'abord.
`GET /workspaces/:workspaceId/dashboard` (VIEWER) →
```
{ data: { totals: { total, completed, inProgress, overdue },     // overdue = dueDate < now ET status ≠ DONE, projets ACTIVE
          assignedToMe: { count, tasks: Task[] (10 max, non DONE, triées échéance puis priorité) },
          projectProgress: [{ projectId, name, identifier, total, done }],
          recentActivity: Activity[] (10) } }
```

### Notifications (`modules/notifications`) — de l'utilisateur courant, tous workspaces ; `?workspaceId=` filtre
`GET /notifications?unread=true&cursor&limit` · `GET /notifications/unread-count` → `{data:{count}}` · `POST /notifications/:id/read` · `POST /notifications/read-all` 204

### Tokens API (`modules/api-tokens`) — rôle MEMBER minimum ; jamais exposés après création
`GET /workspaces/:workspaceId/api-tokens` (mes tokens ; ADMIN+ voit tous ceux du workspace) → ApiToken[]
`POST /workspaces/:workspaceId/api-tokens {name, scopes[], expiresInDays?}` 201 → `{data:{token: ApiToken, secret}}` — `secret` = `dsk_` + 43 car. base64url, affiché UNE fois, seul le SHA-256 est stocké ; scopes ⊆ `API_TOKEN_SCOPES` ; un VIEWER ne peut demander que les scopes `*:read`
`DELETE /api-tokens/:tokenId` 204 → révoque (`revokedAt`) ; propriétaire ou ADMIN+

## API agent (`modules/agents`) — `Authorization: Bearer dsk_…` ; le token est lié à UN workspace
Chaque appel : `authorize()` avec le principal-token (scope + rôle courant) ; les mutations enregistrent `Activity.apiTokenId` ; mêmes services que le web (`modules/tasks/service.ts`). Même enveloppe/forme que les routes web.
| Route | Scope |
| --- | --- |
| `GET /agent/workspaces` → [Workspace du token] | workspaces:read |
| `GET /agent/projects` → projets du workspace | projects:read |
| `GET /agent/projects/:projectId/tasks?status&priority&assigneeId&q` | tasks:read |
| `GET /agent/tasks/:taskId` | tasks:read |
| `POST /agent/projects/:projectId/tasks` (même body que web) 201 | tasks:write |
| `PATCH /agent/tasks/:taskId` (body web + `status?` : appelle move en fin de colonne) | tasks:write |
| `POST /agent/tasks/:taskId/assign {assigneeId: uuid\|null}` | tasks:write |
| `POST /agent/tasks/:taskId/comments {body}` 201 | comments:write |
| `GET /agent/projects/:projectId/activity` | activity:read |
Les actions des agents apparaissent dans le fil (`viaAgent: true`) et sont journalisées (`req.log.info({ tokenId, action })`).

## Temps réel — `GET /api/ws` (upgrade WebSocket, `modules/realtime`)
- Auth : cookie `ds_access` valide sur l'upgrade ET `Origin` = `WEB_ORIGIN`, sinon fermeture 4401. Le JWT expiré en cours de connexion n'ouvre rien de nouveau : l'abonnement est revalidé (membership en base) à chaque `subscribe`.
- Client → serveur : `{type:"subscribe", workspaceId}` · `{type:"unsubscribe", workspaceId}` · `{type:"ping"}`.
- Serveur → client : `{type:"subscribed", workspaceId, presence:[userId]}` · `{type:"error", code, message}` (non-membre : `NOT_FOUND`) · `{type:"pong"}` · `{type:"event", event: DomainEvent}` avec `DomainEvent = { id, type, workspaceId, projectId?, actorId?, data, at }` (src/events.ts). Les événements avec `audience` ne vont qu'à ces utilisateurs (toutes leurs sockets, abonnées ou non).
- Un événement n'est livré qu'aux sockets abonnées au workspace ET dont l'utilisateur est toujours membre (revérifié à la livraison pour les `member.removed`). Heartbeat serveur 30 s (ws ping) ; sockets mortes fermées.
- Présence : en mémoire, par workspace ; `presence.changed {userIds}` diffusé à l'arrivée/départ d'un premier/dernier socket d'un utilisateur.
- Types d'événements & `data` : `project.created|updated {project}` · `task.created|updated|assigned {task}` · `task.status_changed {task, from, to}` · `task.deleted {taskId, projectId}` · `comment.created {taskId, comment}` · `member.joined {member}` · `member.removed {userId}` · `member.role_changed {userId, role}` · `presence.changed {userIds}` · `notification.created {id,type,data,createdAt}`.
- Dédoublonnage : chaque événement a un `id` unique, le client ignore les ids déjà vus ; reconnexion avec backoff exponentiel (1 s → 30 s) + resubscribe + refetch des requêtes actives.

## Santé / docs
`GET /health` · `GET /health/ready` (SELECT 1) · OpenAPI JSON `/docs/json`, UI `/docs`.
