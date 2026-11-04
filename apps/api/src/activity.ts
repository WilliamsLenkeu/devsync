import type { Prisma } from './generated/prisma/client';
import type { ActivityType } from './generated/prisma/enums';
import type { Principal } from './types';

type Tx = Prisma.TransactionClient;

export interface ActivityInput {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  type: ActivityType;
  /** Small JSON snapshot used to render the feed (titles, from/to values…) so it survives deletions. */
  data?: Prisma.InputJsonObject;
}

/** Persist an activity row inside the caller's transaction. */
export const recordActivity = (tx: Tx, actor: Principal, input: ActivityInput) =>
  tx.activity.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      actorId: actor.userId,
      apiTokenId: actor.apiToken?.id ?? null,
      type: input.type,
      data: input.data ?? {},
    },
  });
