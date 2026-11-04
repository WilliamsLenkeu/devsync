import { describe, expect, it } from 'vitest';
import type { Task } from '@/lib/types';
import {
  applyMove,
  getDropTarget,
  groupByStatus,
  hasActiveFilters,
  isManualOrder,
  isNoopDrop,
  parseBoardFilters,
  parseLabelNames,
  toApiQuery,
  withTaskParam,
  writeBoardFilters,
  type BoardFilters,
} from './boardLogic';

const base: Task = {
  id: 'a',
  projectId: 'p1',
  number: 1,
  key: 'WEB-1',
  title: 'A',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  position: 1,
  dueDate: null,
  assignee: null,
  reporter: { id: 'u1', name: 'Ada', avatarUrl: null },
  labels: [],
  commentCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const task = (partial: Partial<Task> & Pick<Task, 'id'>): Task => ({ ...base, ...partial });

const defaults: BoardFilters = {
  q: '',
  priority: '',
  assignee: '',
  label: '',
  sort: 'position',
  order: 'asc',
};

describe('parseBoardFilters / writeBoardFilters', () => {
  it('parses known values and falls back on junk', () => {
    const params = new URLSearchParams(
      'q=login&priority=HIGH&assignee=me&label=bug&sort=dueDate&order=desc&task=keep-me',
    );
    expect(parseBoardFilters(params)).toEqual({
      q: 'login',
      priority: 'HIGH',
      assignee: 'me',
      label: 'bug',
      sort: 'dueDate',
      order: 'desc',
    });
    expect(parseBoardFilters(new URLSearchParams('priority=NOPE&sort=wat&order=up'))).toEqual(
      defaults,
    );
  });

  it('drops defaults and keeps unrelated params', () => {
    const prev = new URLSearchParams('task=t1&q=old');
    const next = writeBoardFilters(prev, { ...defaults, q: 'new', priority: 'LOW' });
    expect(next.get('task')).toBe('t1');
    expect(next.get('q')).toBe('new');
    expect(next.get('priority')).toBe('LOW');
    expect(next.get('sort')).toBeNull();
    expect(next.get('order')).toBeNull();
  });
});

describe('filter helpers', () => {
  it('detects active filters and manual order', () => {
    expect(hasActiveFilters(defaults)).toBe(false);
    expect(isManualOrder(defaults)).toBe(true);
    expect(isManualOrder({ ...defaults, q: 'x' })).toBe(false);
    expect(isManualOrder({ ...defaults, sort: 'priority' })).toBe(false);
    expect(isManualOrder({ ...defaults, order: 'desc' })).toBe(false);
    expect(toApiQuery({ ...defaults, assignee: 'me' })).toMatchObject({ assigneeId: 'me' });
  });

  it('parses label names and manages ?task=', () => {
    expect(parseLabelNames('bug, ui,, bug')).toEqual(['bug', 'ui']);
    const params = withTaskParam(new URLSearchParams('q=1'), 't9');
    expect(params.get('task')).toBe('t9');
    expect(withTaskParam(params, null).get('task')).toBeNull();
  });
});

describe('drop / move', () => {
  const column = [
    task({ id: 'a', status: 'TODO', title: 'A' }),
    task({ id: 'b', status: 'TODO', title: 'B' }),
    task({ id: 'c', status: 'TODO', title: 'C' }),
    task({ id: 'd', status: 'DONE', title: 'D' }),
  ];

  it('places before the hovered card, or after when moving down', () => {
    expect(getDropTarget(column, 'a', 'c', 'TODO')).toEqual({ status: 'TODO', beforeTaskId: null });
    expect(getDropTarget(column, 'c', 'a', 'TODO')).toEqual({ status: 'TODO', beforeTaskId: 'a' });
    expect(getDropTarget(column, 'a', null, 'DONE')).toEqual({
      status: 'DONE',
      beforeTaskId: null,
    });
    expect(getDropTarget(column, 'a', 'a', 'TODO')).toEqual({ status: 'TODO', beforeTaskId: 'b' });
  });

  it('detects no-op drops', () => {
    expect(isNoopDrop(column, 'a', { status: 'TODO', beforeTaskId: 'b' })).toBe(true);
    expect(isNoopDrop(column, 'a', { status: 'TODO', beforeTaskId: 'c' })).toBe(false);
    expect(isNoopDrop(column, 'a', { status: 'DONE', beforeTaskId: null })).toBe(false);
  });

  it('applies optimistic moves and groups by status', () => {
    const moved = applyMove(column, 'a', { status: 'DONE', beforeTaskId: 'd' });
    expect(moved.map((t) => t.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(moved.find((t) => t.id === 'a')?.status).toBe('DONE');

    const end = applyMove(column, 'a', { status: 'DONE', beforeTaskId: null });
    expect(end.map((t) => t.id)).toEqual(['b', 'c', 'd', 'a']);

    const groups = groupByStatus(column);
    expect(groups.TODO.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(groups.DONE.map((t) => t.id)).toEqual(['d']);
    expect(groups.BACKLOG).toEqual([]);
  });
});
