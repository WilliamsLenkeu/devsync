import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export const EVENT_TYPES = [
  'project.created',
  'project.updated',
  'task.created',
  'task.updated',
  'task.status_changed',
  'task.assigned',
  'task.deleted',
  'comment.created',
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

/** In-process pub/sub. Services publish AFTER their transaction commits. ponytail: single node only; swap for Redis/PG LISTEN to scale out. */
export class EventBus {
  private readonly emitter = new EventEmitter();

  publish(event: NewEvent): DomainEvent {
    const full: DomainEvent = { ...event, id: randomUUID(), at: new Date().toISOString() };
    this.emitter.emit('event', full);
    return full;
  }

  subscribe(handler: (event: DomainEvent) => void): () => void {
    this.emitter.on('event', handler);
    return () => this.emitter.off('event', handler);
  }
}
