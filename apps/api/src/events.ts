import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';

export const EVENT_TYPES = [
  'project.created',
  'project.updated',
  'task.created',
  'task.updated',
  'task.status_changed',
  'task.assigned',
  'task.deleted',
  'comment.created',
  'attachment.created',
  'attachment.deleted',
  'member.joined',
  'member.removed',
  'member.role_changed',
  'presence.changed',
  'notification.created',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface DomainEvent {
  /** Unique id; clients de-duplicate on it. */
  id: string;
  type: EventType;
  workspaceId: string;
  projectId?: string;
  /** Acting user, so clients can ignore their own echoes if they wish. */
  actorId?: string;
  /** When set, only these users receive the event (e.g. notifications). Otherwise every workspace subscriber. */
  audience?: string[];
  data: Record<string, unknown>;
  at: string;
}

export type NewEvent = Omit<DomainEvent, 'id' | 'at'>;

export interface EventBus {
  publish(event: NewEvent): DomainEvent;
  subscribe(handler: (event: DomainEvent) => void): () => void;
  close(): Promise<void>;
}

const REDIS_CHANNEL = 'devsync:events';

/** In-process pub/sub (single node). */
export class LocalEventBus implements EventBus {
  private readonly emitter = new EventEmitter();

  publish(event: NewEvent): DomainEvent {
    const full: DomainEvent = { ...event, id: randomUUID(), at: new Date().toISOString() };
    this.dispatch(full);
    return full;
  }

  /** Deliver an already-minted event (e.g. from another node) without minting a new id. */
  dispatch(event: DomainEvent): void {
    this.emitter.emit('event', event);
  }

  subscribe(handler: (event: DomainEvent) => void): () => void {
    this.emitter.on('event', handler);
    return () => this.emitter.off('event', handler);
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}

type RedisWire = { origin: string; event: DomainEvent };

/**
 * Fan-out across API processes via Redis pub/sub.
 * Presence stays in-process per node (documented).
 * ponytail: one Redis channel for all workspaces; shard by workspaceId if volume grows.
 */
export class RedisEventBus implements EventBus {
  private readonly local = new LocalEventBus();
  private readonly nodeId = randomUUID();

  private constructor(
    private readonly pub: RedisClientType,
    private readonly sub: RedisClientType,
  ) {}

  static async connect(redisUrl: string): Promise<RedisEventBus> {
    const pub = createClient({ url: redisUrl }) as RedisClientType;
    const sub = pub.duplicate() as RedisClientType;
    pub.on('error', (err) => console.error('[events] redis pub', err));
    sub.on('error', (err) => console.error('[events] redis sub', err));
    await Promise.all([pub.connect(), sub.connect()]);
    const bus = new RedisEventBus(pub, sub);
    await sub.subscribe(REDIS_CHANNEL, (raw) => {
      try {
        const wire = JSON.parse(raw) as RedisWire;
        if (!wire?.event?.id || wire.origin === bus.nodeId) return;
        bus.local.dispatch(wire.event);
      } catch {
        /* ignore malformed */
      }
    });
    return bus;
  }

  publish(event: NewEvent): DomainEvent {
    const full = this.local.publish(event);
    const wire: RedisWire = { origin: this.nodeId, event: full };
    void this.pub.publish(REDIS_CHANNEL, JSON.stringify(wire)).catch((err) => {
      console.error('[events] redis publish failed', err);
    });
    return full;
  }

  subscribe(handler: (event: DomainEvent) => void): () => void {
    return this.local.subscribe(handler);
  }

  async close(): Promise<void> {
    await this.local.close();
    await Promise.allSettled([this.sub.quit(), this.pub.quit()]);
  }
}

/** REDIS_URL set → Redis fan-out; otherwise local-only. */
export async function createEventBus(redisUrl?: string): Promise<EventBus> {
  if (!redisUrl?.trim()) return new LocalEventBus();
  return RedisEventBus.connect(redisUrl.trim());
}
