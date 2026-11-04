import type { Prisma } from './generated/prisma/client';
import type { NotificationType } from './generated/prisma/enums';
import type { EventBus } from './events';

export interface NotificationInput {
  userId: string;
  workspaceId: string;
  type: NotificationType;
  /** Renderable snapshot, e.g. `{ taskId, taskTitle, projectId, actorName }`. */
  data?: Prisma.InputJsonObject;
}

/** Insert notifications inside the caller's transaction. Skip self-notifications at the call site. */
export const createNotifications = (tx: Prisma.TransactionClient, inputs: NotificationInput[]) =>
  Promise.all(
    inputs.map((n) =>
      tx.notification.create({
        data: { userId: n.userId, workspaceId: n.workspaceId, type: n.type, data: n.data ?? {} },
      }),
    ),
  );

/** Push freshly committed notifications to their recipients' sockets. Call AFTER the transaction commits. */
export const publishNotifications = (
  events: EventBus,
  rows: Awaited<ReturnType<typeof createNotifications>>,
) => {
  for (const n of rows) {
    events.publish({
      type: 'notification.created',
      workspaceId: n.workspaceId,
      audience: [n.userId],
      data: { id: n.id, type: n.type, data: n.data, createdAt: n.createdAt.toISOString() },
    });
  }
};
