import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectStatus } from '@devsync/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Activity, Member, Project, ProjectMember, Task } from '@/lib/types';

export interface CreateProjectBody {
  name: string;
  identifier: string;
  description?: string;
}

export interface UpdateProjectBody {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
}

export const useProjects = (workspaceId: string, status?: ProjectStatus) =>
  useQuery({
    queryKey: [...qk.projects(workspaceId), status ?? 'ALL'],
    queryFn: () => api.get<Project[]>(`/workspaces/${workspaceId}/projects`, { status }),
  });

export const useProject = (projectId: string) =>
  useQuery({
    queryKey: qk.project(projectId),
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
  });

/** Non-paginated board (≤ 500 tasks server-side). Used for the per-status breakdown only. */
export const useProjectTasks = (projectId: string) =>
  useQuery({
    queryKey: [...qk.tasks(projectId), {}],
    queryFn: () => api.get<Task[]>(`/projects/${projectId}/tasks`),
  });

export const useProjectMembers = (projectId: string) =>
  useQuery({
    queryKey: qk.projectMembers(projectId),
    queryFn: () => api.get<ProjectMember[]>(`/projects/${projectId}/members`),
  });

export const useWorkspaceMembers = (workspaceId: string, enabled: boolean) =>
  useQuery({
    queryKey: qk.members(workspaceId),
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
    enabled,
  });

export const useProjectActivity = (projectId: string) =>
  useInfiniteQuery({
    queryKey: qk.projectActivity(projectId),
    queryFn: ({ pageParam }) =>
      api.page<Activity>(`/projects/${projectId}/activity`, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const useCreateProject = (workspaceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectBody) =>
      api.post<Project>(`/workspaces/${workspaceId}/projects`, body),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.projects(workspaceId) }),
        qc.invalidateQueries({ queryKey: qk.dashboard(workspaceId) }),
      ]),
  });
};

export const useUpdateProject = (projectId: string, workspaceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProjectBody) => api.patch<Project>(`/projects/${projectId}`, body),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.project(projectId) }),
        qc.invalidateQueries({ queryKey: qk.projects(workspaceId) }),
        qc.invalidateQueries({ queryKey: qk.dashboard(workspaceId) }),
        qc.invalidateQueries({ queryKey: qk.projectActivity(projectId) }),
      ]),
  });
};

export const useAddProjectMember = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/projects/${projectId}/members`, { userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projectMembers(projectId) }),
  });
};

export const useRemoveProjectMember = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    // Removing a member unassigns their tasks in this project.
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.projectMembers(projectId) }),
        qc.invalidateQueries({ queryKey: qk.tasks(projectId) }),
      ]),
  });
};
