// Copie locale de packages/shared/src/index.ts (TASK_STATUSES, TASK_PRIORITIES).
// Dupliqué car @devsync/shared n'est pas (encore) une dépendance de ce package.
// À resynchroniser si les enums changent dans packages/shared.
export const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
