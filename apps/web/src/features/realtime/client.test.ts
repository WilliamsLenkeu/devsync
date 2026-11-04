import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient, type RealtimeHandlers } from './client';
import type { DomainEvent } from './events';

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor() {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  /** Server-side drop. */
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

const event = (id: string): DomainEvent => ({
  id,
  type: 'task.created',
  workspaceId: 'w1',
  projectId: 'p1',
  data: {},
  at: '2026-01-01T00:00:00.000Z',
});

const handlers = (): { [K in keyof RealtimeHandlers]: ReturnType<typeof vi.fn> } => ({
  onStatus: vi.fn(),
  onSubscribed: vi.fn(),
  onEvent: vi.fn(),
  onReconnect: vi.fn(),
});

const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];

describe('RealtimeClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('subscribes on open and reports the subscription presence', () => {
    const h = handlers();
    const client = new RealtimeClient('ws://x/api/ws', h);
    client.setWorkspace('w1');
    client.start();
    last().open();

    expect(last().sent).toEqual([JSON.stringify({ type: 'subscribe', workspaceId: 'w1' })]);
    last().receive({ type: 'subscribed', workspaceId: 'w1', presence: ['u1'] });
    expect(h.onSubscribed).toHaveBeenCalledWith('w1', ['u1']);
    expect(h.onStatus).toHaveBeenLastCalledWith('open');
  });

  it('delivers each event id only once', () => {
    const h = handlers();
    const client = new RealtimeClient('ws://x/api/ws', h);
    client.start();
    last().open();
    last().receive({ type: 'event', event: event('e1') });
    last().receive({ type: 'event', event: event('e1') });
    last().receive({ type: 'event', event: event('e2') });

    expect(h.onEvent.mock.calls.map(([e]) => (e as DomainEvent).id)).toEqual(['e1', 'e2']);
  });

  it('reconnects with exponential backoff, resubscribes and refetches', () => {
    const h = handlers();
    const client = new RealtimeClient('ws://x/api/ws', h);
    client.setWorkspace('w1');
    client.start();
    last().open();

    last().drop();
    vi.advanceTimersByTime(999);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);

    last().drop();
    vi.advanceTimersByTime(1999);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(3);

    last().open();
    expect(h.onReconnect).toHaveBeenCalledTimes(1);
    expect(last().sent).toEqual([JSON.stringify({ type: 'subscribe', workspaceId: 'w1' })]);

    // Backoff resets after a successful open.
    last().drop();
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(4);
  });

  it('caps the backoff at 30 s', () => {
    const client = new RealtimeClient('ws://x/api/ws', handlers());
    client.start();
    for (let i = 0; i < 6; i++) {
      last().drop();
      vi.advanceTimersByTime(30_000);
    }
    const count = FakeSocket.instances.length;
    last().drop();
    vi.advanceTimersByTime(29_999);
    expect(FakeSocket.instances).toHaveLength(count);
  });

  it('pings every 25 s while open and stays silent after stop()', () => {
    const client = new RealtimeClient('ws://x/api/ws', handlers());
    client.start();
    last().open();
    vi.advanceTimersByTime(25_000);
    expect(last().sent).toContain(JSON.stringify({ type: 'ping' }));

    client.stop();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('switches subscription when the workspace changes on an open socket', () => {
    const client = new RealtimeClient('ws://x/api/ws', handlers());
    client.setWorkspace('w1');
    client.start();
    last().open();
    client.setWorkspace('w2');

    expect(last().sent.slice(1)).toEqual([
      JSON.stringify({ type: 'unsubscribe', workspaceId: 'w1' }),
      JSON.stringify({ type: 'subscribe', workspaceId: 'w2' }),
    ]);
  });
});
