import { describe, expect, it } from 'vitest';
import { LocalEventBus } from './events';

describe('LocalEventBus', () => {
  it('delivers published events to subscribers', () => {
    const bus = new LocalEventBus();
    const seen: string[] = [];
    const off = bus.subscribe((e) => seen.push(e.id));
    const a = bus.publish({
      type: 'task.created',
      workspaceId: '00000000-0000-7000-8000-000000000001',
      data: {},
    });
    expect(seen).toEqual([a.id]);
    off();
    bus.publish({
      type: 'task.updated',
      workspaceId: '00000000-0000-7000-8000-000000000001',
      data: {},
    });
    expect(seen).toEqual([a.id]);
  });

  it('dispatch reuses the event id', () => {
    const bus = new LocalEventBus();
    let got = '';
    bus.subscribe((e) => {
      got = e.id;
    });
    bus.dispatch({
      id: 'fixed-id',
      type: 'presence.changed',
      workspaceId: '00000000-0000-7000-8000-000000000001',
      data: { userIds: [] },
      at: new Date().toISOString(),
    });
    expect(got).toBe('fixed-id');
  });
});
