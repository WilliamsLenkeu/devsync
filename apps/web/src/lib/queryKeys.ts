/** Central TanStack Query keys. Realtime handlers invalidate by these prefixes — never inline a key elsewhere. */
export const qk = {
  me: ['me'] as const,
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspace', id] as const,
  members: (wid: string) => ['workspace', wid, 'members'] as const,
  workspaceInvitations: (wid: string) => ['workspace', wid, 'invitations'] as const,
  myInvitations: ['invitations'] as const,
  projects: (wid: string) => ['workspace', wid, 'projects'] as const,
  project: (pid: string) => ['project', pid] as const,
  projectMembers: (pid: string) => ['project', pid, 'members'] as const,
  /** Prefix for every task list of a project; append the filters object for a specific list. */
  tasks: (pid: string) => ['project', pid, 'tasks'] as const,
  task: (tid: string) => ['task', tid] as const,
  comments: (tid: string) => ['task', tid, 'comments'] as const,
  taskActivity: (tid: string) => ['task', tid, 'activity'] as const,
  activity: (wid: string) => ['workspace', wid, 'activity'] as const,
  projectActivity: (pid: string) => ['project', pid, 'activity'] as const,
  dashboard: (wid: string) => ['workspace', wid, 'dashboard'] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  apiTokens: (wid: string) => ['workspace', wid, 'api-tokens'] as const,
};
