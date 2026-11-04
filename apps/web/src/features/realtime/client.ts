import type { DomainEvent } from './events';

export type RealtimeStatus = 'connecting' | 'open' | 'closed';

type ServerMessage =
  | { type: 'subscribed'; workspaceId: string; presence: string[] }
  | { type: 'event'; event: DomainEvent }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' };

type ClientMessage = { type: 'ping' } | { type: 'subscribe' | 'unsubscribe'; workspaceId: string };

export interface RealtimeHandlers {
  onStatus: (status: RealtimeStatus) => void;
  onSubscribed: (workspaceId: string, presence: string[]) => void;
  onEvent: (event: DomainEvent) => void;
  /** Fired after a successful reconnection: the caller refetches what was missed. */
  onReconnect: () => void;
}

const OPEN = 1;
const MAX_BACKOFF_MS = 30_000;
const PING_MS = 25_000;
// ponytail: dedupe window is a bounded insertion-ordered Set; ids older than the last 500 events are forgotten. Good enough for one socket.
const SEEN_LIMIT = 500;

/** One WebSocket to `/api/ws`, subscribed to a single workspace at a time, with backoff reconnection. */
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private workspaceId: string | null = null;
  private attempts = 0;
  private hasConnected = false;
  private stopped = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private readonly seen = new Set<string>();
  private readonly url: string;
  private readonly handlers: RealtimeHandlers;

  constructor(url: string, handlers: RealtimeHandlers) {
    this.url = url;
    this.handlers = handlers;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.handlers.onStatus('closed');
  }

  /** Subscribes on the open socket now, or on the next open. */
  setWorkspace(workspaceId: string | null): void {
    const previous = this.workspaceId;
    this.workspaceId = workspaceId;
    if (this.socket?.readyState !== OPEN || previous === workspaceId) return;
    if (previous) this.send({ type: 'unsubscribe', workspaceId: previous });
    if (workspaceId) this.send({ type: 'subscribe', workspaceId });
  }

  private connect(): void {
    this.handlers.onStatus('connecting');
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.attempts = 0;
      this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_MS);
      this.handlers.onStatus('open');
      if (this.workspaceId) this.send({ type: 'subscribe', workspaceId: this.workspaceId });
      if (this.hasConnected) this.handlers.onReconnect();
      this.hasConnected = true;
    };

    socket.onmessage = (e: MessageEvent<string>) => {
      if (this.socket !== socket) return;
      const msg = JSON.parse(e.data) as ServerMessage;
      if (msg.type === 'event') this.deliver(msg.event);
      else if (msg.type === 'subscribed') this.handlers.onSubscribed(msg.workspaceId, msg.presence);
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      clearInterval(this.pingTimer);
      this.socket = null;
      this.handlers.onStatus('closed');
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempts);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private deliver(event: DomainEvent): void {
    if (this.seen.has(event.id)) return;
    this.seen.add(event.id);
    if (this.seen.size > SEEN_LIMIT) {
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    this.handlers.onEvent(event);
  }

  private send(msg: ClientMessage): void {
    this.socket?.send(JSON.stringify(msg));
  }
}
