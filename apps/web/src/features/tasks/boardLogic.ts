import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '@devsync/shared';
import { format, parseISO } from 'date-fns';
import type { Task } from '@/lib/types';

export const SORT_KEYS = ['position', 'createdAt', 'updatedAt', 'dueDate', 'priority'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** View state of the board. Lives in the URL (`?q=&priority=&assignee=&label=&sort=&order=`). */
export interface BoardFilters {
  q: string;
  priority: TaskPriority | '';
  /** member userId | 'me' | 'none' (unassigned) | '' (any) */
  assignee: string;
  /** label name, case-insensitive (API) */
  label: string;
  sort: SortKey;
  order: 'asc' | 'desc';
}

const isPriority = (v: string): v is TaskPriority => (TASK_PRIORITIES as readonly string[]).includes(v);
const isSortKey = (v: string): v is SortKey => (SORT_KEYS as readonly string[]).includes(v);

export function parseBoardFilters(params: URLSearchParams): BoardFilters {
  const priority = params.get('priority') ?? '';
  const sort = params.get('sort') ?? '';
  return {
    q: params.get('q') ?? '',
    priority: isPriority(priority) ? priority : '',
    assignee: params.get('assignee') ?? '',
    label: params.get('label') ?? '',
    sort: isSortKey(sort) ? sort : 'position',
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
  };
}

/** Writes the view state back, dropping defaults so the URL stays clean. Other params (e.g. `task`) are kept. */
export function writeBoardFilters(prev: URLSearchParams, next: BoardFilters): URLSearchParams {
  const params = new URLSearchParams(prev);
  const values = {
    q: next.q,
    priority: next.priority,
    assignee: next.assignee,
    label: next.label,
    sort: next.sort === 'position' ? '' : next.sort,
    order: next.order === 'asc' ? '' : next.order,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return params;
}

export const hasActiveFilters = (f: BoardFilters) => !!(f.q || f.priority || f.assignee || f.label);

/** Reordering inside a column only makes sense on the plain, unfiltered, position-sorted board. */
export const isManualOrder = (f: BoardFilters) => !hasActiveFilters(f) && f.sort === 'position' && f.order === 'asc';

export const toApiQuery = (f: BoardFilters) => ({
  q: f.q,
  priority: f.priority,
  assigneeId: f.assignee,
  label: f.label,
  sort: f.sort,
  order: f.order,
});

/** `?task=<id>` handling for the detail sheet. `null` removes the param. */
export function withTaskParam(prev: URLSearchParams, taskId: string | null): URLSearchParams {
  const params = new URLSearchParams(prev);
  if (taskId) params.set('task', taskId);
  else params.delete('task');
  return params;
}

export interface DropTarget {
  status: TaskStatus;
  /** Card that must sit right after the moved task; null = end of column. */
  beforeTaskId: string | null;
}

const columnIds = (tasks: Task[], status: TaskStatus) => tasks.filter((t) => t.status === status).map((t) => t.id);

/**
 * Target of a drop. `overId` is the card under the pointer/focus, or null when dropped on the column itself (= end).
 * Dropping below a card lands after it (sortable semantics), above it lands before it.
 */
export function getDropTarget(tasks: Task[], activeId: string, overId: string | null, status: TaskStatus): DropTarget {
  const column = columnIds(tasks, status);
  if (overId === null || !column.includes(overId)) return { status, beforeTaskId: null };
  const from = column.indexOf(activeId);
  const to = column.indexOf(overId);
  if (overId === activeId) return { status, beforeTaskId: column[from + 1] ?? null };
  const movingDown = from !== -1 && from < to;
  return { status, beforeTaskId: movingDown ? (column[to + 1] ?? null) : overId };
}

/** True when the drop would not change anything (same column, same neighbour). */
export function isNoopDrop(tasks: Task[], activeId: string, target: DropTarget): boolean {
  const column = columnIds(tasks, target.status);
  const index = column.indexOf(activeId);
  return index !== -1 && (column[index + 1] ?? null) === target.beforeTaskId;
}

/** Optimistic cache update mirroring the server's move semantics. */
export function applyMove(tasks: Task[], taskId: string, target: DropTarget): Task[] {
  const moved = tasks.find((t) => t.id === taskId);
  if (!moved) return tasks;
  const rest = tasks.filter((t) => t.id !== taskId);
  const index =
    target.beforeTaskId === null
      ? rest.findLastIndex((t) => t.status === target.status) + 1
      : rest.findIndex((t) => t.id === target.beforeTaskId);
  return rest.toSpliced(index === -1 ? rest.length : index, 0, { ...moved, status: target.status });
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups = Object.fromEntries(TASK_STATUSES.map((s) => [s, []])) as Record<TaskStatus, Task[]>;
  for (const task of tasks) groups[task.status].push(task);
  return groups;
}

/** `<input type="date">` value (local day) <-> ISO instant sent to the API. */
export const dateInputToIso = (value: string) => new Date(`${value}T00:00:00`).toISOString();
export const isoToDateInput = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');

/** "bug, ui,, bug" -> ["bug", "ui"] */
export function parseLabelNames(input: string): string[] {
  return [...new Set(input.split(',').map((s) => s.trim()).filter(Boolean))];
}

export const taskHref = (params: URLSearchParams, taskId: string) => `?${withTaskParam(params, taskId)}`;
