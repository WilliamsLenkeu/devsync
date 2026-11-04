import { ACTION_SCOPE, can, type Action, type WorkspaceRole } from '@devsync/shared';
import type { Db } from './db';
import { forbidden, notFound } from './errors';
import type { Principal } from './types';

/**
 * Single authorization entry point for web AND agent routes.
 * - Non-members get 404 (existence is not leaked).
 * - Members lacking the role get 403.
 * - API tokens additionally need the matching scope, and only work inside their own workspace.
 * Always checks the user's CURRENT role, so demoting/removing a user instantly limits their tokens.
 */
export async function authorize(
  db: Db,
  principal: Principal,
  workspaceId: string,
  action: Action,
): Promise<WorkspaceRole> {
  const { apiToken } = principal;
  if (apiToken && apiToken.workspaceId !== workspaceId) throw notFound('Workspace');

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: principal.userId } },
    select: { role: true },
  });
  if (!membership) throw notFound('Workspace');

  if (apiToken) {
    const scope = ACTION_SCOPE[action];
    if (!scope || !apiToken.scopes.includes(scope))
      throw forbidden(`Token lacks scope for ${action}`);
  }
  if (!can(membership.role, action)) throw forbidden();
  return membership.role;
}

/** Load a project and authorize against its workspace in one step. */
export async function authorizeProject(
  db: Db,
  principal: Principal,
  projectId: string,
  action: Action,
) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound('Project');
  const role = await authorize(db, principal, project.workspaceId, action);
  return { project, role };
}

/** Load a task (with its project) and authorize against the workspace in one step. */
export async function authorizeTask(db: Db, principal: Principal, taskId: string, action: Action) {
  const task = await db.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task) throw notFound('Task');
  const role = await authorize(db, principal, task.project.workspaceId, action);
  return { task, project: task.project, role };
}
