import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { ACCESS_COOKIE, verifyAccessToken } from '../../plugins/auth';
import type { DomainEvent } from '../../events';
import { uuid } from '../../lib/schemas';

const HEARTBEAT_MS = 30_000;
const CLOSE_UNAUTHENTICATED = 4401;

const clientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subscribe'), workspaceId: uuid }),
  z.object({ type: z.literal('unsubscribe'), workspaceId: uuid }),
  z.object({ type: z.literal('ping') }),
]);

interface Client {
  socket: WebSocket;
  userId: string;
  alive: boolean;
  workspaces: Set<string>;
}

const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(websocket);

  const clients = new Set<Client>();
  /** workspaceId -> userId -> number of sockets of that user subscribed to it. */
  const presence = new Map<string, Map<string, number>>();

  // ponytail: fan-out scans every client (O(n) per event); index by workspace when connections grow.
  const send = (client: Client, message: unknown) => {
    if (client.socket.readyState === client.socket.OPEN)
      client.socket.send(JSON.stringify(message));
  };

  const presenceOf = (workspaceId: string) => [...(presence.get(workspaceId)?.keys() ?? [])];

  const publishPresence = (workspaceId: string) =>
    app.events.publish({
      type: 'presence.changed',
      workspaceId,
      data: { userIds: presenceOf(workspaceId) },
    });

  /** Returns true when the user's first socket joined the workspace. */
  const join = (client: Client, workspaceId: string) => {
    client.workspaces.add(workspaceId);
    let users = presence.get(workspaceId);
    if (!users) presence.set(workspaceId, (users = new Map()));
    const count = users.get(client.userId) ?? 0;
    users.set(client.userId, count + 1);
    return count === 0;
  };

  const leave = (client: Client, workspaceId: string) => {
    if (!client.workspaces.delete(workspaceId)) return;
    const users = presence.get(workspaceId);
    if (!users) return;
    const count = users.get(client.userId) ?? 1;
    if (count > 1) return void users.set(client.userId, count - 1);
    users.delete(client.userId);
    if (users.size === 0) presence.delete(workspaceId);
    publishPresence(workspaceId);
  };

  const dropClient = (client: Client) => {
    clients.delete(client);
    for (const workspaceId of [...client.workspaces]) leave(client, workspaceId);
  };

  const onEvent = (event: DomainEvent) => {
    if (event.type === 'member.removed' && typeof event.data.userId === 'string') {
      for (const client of [...clients]) {
        if (client.userId === event.data.userId) leave(client, event.workspaceId);
      }
    }
    for (const client of clients) {
      const reachable = event.audience
        ? event.audience.includes(client.userId)
        : client.workspaces.has(event.workspaceId);
      if (reachable) send(client, { type: 'event', event });
    }
  };
  const unsubscribe = app.events.subscribe(onEvent);

  const handleMessage = async (client: Client, raw: string) => {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return send(client, { type: 'error', code: 'VALIDATION_ERROR', message: 'Invalid JSON' });
    }
    const parsed = clientMessage.safeParse(json);
    if (!parsed.success)
      return send(client, {
        type: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid message',
      });

    const message = parsed.data;
    if (message.type === 'ping') return send(client, { type: 'pong' });
    if (message.type === 'unsubscribe') return leave(client, message.workspaceId);

    const { workspaceId } = message;
    // Membership is checked on every subscribe: the JWT alone does not grant access.
    const member = await app.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: client.userId } },
      select: { id: true },
    });
    if (!clients.has(client)) return;
    if (!member)
      return send(client, { type: 'error', code: 'NOT_FOUND', message: 'Workspace not found' });

    const firstSocket = !client.workspaces.has(workspaceId) && join(client, workspaceId);
    send(client, { type: 'subscribed', workspaceId, presence: presenceOf(workspaceId) });
    if (firstSocket) publishPresence(workspaceId);
  };

  const heartbeat = setInterval(() => {
    for (const client of [...clients]) {
      if (!client.alive) {
        client.socket.terminate();
        continue;
      }
      client.alive = false;
      client.socket.ping();
    }
  }, HEARTBEAT_MS);

  app.addHook('onClose', async () => {
    clearInterval(heartbeat);
    unsubscribe();
    for (const client of [...clients]) {
      clients.delete(client);
      client.socket.terminate();
    }
  });

  app.get(
    '/ws',
    {
      websocket: true,
      schema: { tags: ['Realtime'], summary: 'Real-time WebSocket (upgrade)' },
    },
    async (socket, req) => {
      const token = req.cookies[ACCESS_COOKIE];
      // Auth is async, but frames can arrive right away: messages wait on this promise, in order.
      const ready = (async () => {
        const userId =
          token && req.headers.origin === app.config.WEB_ORIGIN
            ? await verifyAccessToken(app, token)
            : null;
        if (!userId || socket.readyState !== socket.OPEN) {
          socket.close(CLOSE_UNAUTHENTICATED, 'Unauthenticated');
          return null;
        }
        const client: Client = { socket, userId, alive: true, workspaces: new Set() };
        clients.add(client);
        socket.on('pong', () => {
          client.alive = true;
        });
        socket.on('close', () => dropClient(client));
        return client;
      })();

      let queue: Promise<unknown> = ready;
      socket.on('message', (raw) => {
        queue = queue
          .then(async () => {
            const client = await ready;
            if (client) await handleMessage(client, raw.toString());
          })
          .catch((err: unknown) => req.log.error({ err }, 'realtime message failed'));
      });
    },
  );
};

export default routes;
