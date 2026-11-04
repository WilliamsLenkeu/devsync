import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Activity, Comment, Member, Project, ProjectMember, Task } from '@/lib/types';
import { toApiQuery, type BoardFilters } from './boardLogic';

export const useProject = (projectId: string) =>
  useQuery({
    queryKey: qk.project(projectId),
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
  });

export const useProjectMembers = (projectId: string) =>
  useQuery({
    queryKey: qk.projectMembers(projectId),
    queryFn: () => api.get<ProjectMember[]>(`/projects/${projectId}/members`),
  });

export const useWorkspaceMembers = (workspaceId: string) =>
  useQuery({
    queryKey: qk.members(workspaceId),
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
  });

export const useProjectTasks = (projectId: string, filters: BoardFilters) =>
  useQuery({
    queryKey: [...qk.tasks(projectId), filters],
    queryFn: () => api.get<Task[]>(`/projects/${projectId}/tasks`, toApiQuery(filters)),
    placeholderData: keepPreviousData,
  });

export const useTask = (taskId: string) =>
  useQuery({ queryKey: qk.task(taskId), queryFn: () => api.get<Task>(`/tasks/${taskId}`) });

export const useComments = (taskId: string) =>
  useQuery({
    queryKey: qk.comments(taskId),
    queryFn: () => api.get<Comment[]>(`/tasks/${taskId}/comments`),
  });

export const useTaskActivity = (taskId: string) =>
  useInfiniteQuery({
    queryKey: qk.taskActivity(taskId),
    queryFn: ({ pageParam }) =>
      api.page<Activity>(`/tasks/${taskId}/activity`, { cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
