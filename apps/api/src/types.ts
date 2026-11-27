import type { FastifyReply } from 'fastify';
import type { ApiTokenScope } from '@devsync/shared';
import type { Config } from './config';
import type { Db } from './db';
import type { EventBus } from './events';
// EventBus is the interface (Local or Redis).
import type { Mailer } from './lib/mail';

/** Who is performing a request: a logged-in user (cookie) or an agent (API token). */
export interface Principal {
  userId: string;
  apiToken?: { id: string; workspaceId: string; scopes: ApiTokenScope[] };
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    events: EventBus;
    config: Config;
    mailer: Mailer;
    /** preHandler: requires a valid access cookie; sets `request.principal`. */
    requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler: requires `Authorization: Bearer dsk_…`; sets `request.principal` with `apiToken`. */
    requireToken: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    /** Set by `requireUser` / `requireToken`; never read it in a route without one of them. */
    principal: Principal;
  }
}
