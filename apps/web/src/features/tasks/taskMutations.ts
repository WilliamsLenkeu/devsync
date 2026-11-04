import type { TaskPriority, TaskStatus } from '@devsync/shared';
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Task } from '@/lib/types';
import { applyMove, type DropTarget } from './boardLogic';

export interface TaskScope {
  workspaceId: string;
  projectId: string;
}

export interface LabelInput {
  name: string;
  color?: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  labels?: LabelInput[];
}

export interface UpdateTaskBody {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  labels?: LabelInput[];
}

/** Every view that shows a task's data: the project's lists, the sheet, comments/activity, counters, dashboard. */
function invalidateTask(qc: QueryClient, scope: TaskScope, taskId?: string) {
  const keys: QueryKey[] = [
    qk.tasks(scope.projectId),
    qk.project(scope.projectId),
    qk.dashboard(scope.workspaceId),
  ];
  if (taskId) keys.push(qk.task(taskId), qk.comments(taskId), qk.taskActivity(taskId));
  return Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useCreateTask(scope: TaskScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskBody) =>
      api.post<Task>(`/projects/${scope.projectId}/tasks`, body),
    onSuccess: () => {
      toast.success('Task created');
      return invalidateTask(qc, scope);
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not create the task')),
  });
}

export function useMoveTask(scope: TaskScope) {
  const qc = useQueryClient();
  const listKey = qk.tasks(scope.projectId);
  return useMutation({
    mutationFn: ({ taskId, status, beforeTaskId }: DropTarget & { taskId: string }) =>
      api.post<Task>(`/tasks/${taskId}/move`, { status, beforeTaskId }),
    onMutate: async ({ taskId, ...target }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const snapshot = qc.getQueriesData<Task[]>({ queryKey: listKey });
      qc.setQueriesData<Task[]>(
        { queryKey: listKey },
        (old) => old && applyMove(old, taskId, target),
      );
      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(errorMessage(err, 'Could not move the task'));
    },
    onSuccess: (_task, { taskId }) => invalidateTask(qc, scope, taskId),
  });
}

export function useUpdateTask(scope: TaskScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: UpdateTaskBody }) =>
      api.patch<Task>(`/tasks/${taskId}`, body),
    onSuccess: (_task, { taskId }) => invalidateTask(qc, scope, taskId),
    onError: (err) => toast.error(errorMessage(err, 'Could not save the task')),
  });
}

export function useDeleteTask(scope: TaskScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/tasks/${taskId}`),
    onSuccess: (_void, taskId) => {
      toast.success('Task deleted');
      qc.removeQueries({ queryKey: qk.task(taskId) });
      return invalidateTask(qc, scope);
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not delete the task')),
  });
}

export function useCreateComment(scope: TaskScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: string }) =>
      api.post<unknown>(`/tasks/${taskId}/comments`, { body }),
    onSuccess: (_void, { taskId }) => invalidateTask(qc, scope, taskId),
    onError: (err) => toast.error(errorMessage(err, 'Could not post the comment')),
  });
}

export function useDeleteComment(scope: TaskScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; taskId: string }) =>
      api.delete(`/comments/${commentId}`),
    onSuccess: (_void, { taskId }) => invalidateTask(qc, scope, taskId),
    onError: (err) => toast.error(errorMessage(err, 'Could not delete the comment')),
  });
}
