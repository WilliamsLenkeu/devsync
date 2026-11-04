import { can as canDo, type Action } from '@devsync/shared';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api, ApiError } from './api';
import { qk } from './queryKeys';
import type { Workspace } from './types';

interface WorkspaceState {
  workspace: Workspace;
  /** UI affordance only — the API enforces the same policy server-side. */
  can: (action: Action) => boolean;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

/** Loads `:workspaceId` from the URL and provides it (with my role) to the subtree. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { workspaceId = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: qk.workspace(workspaceId),
    queryFn: () => api.get<Workspace>(`/workspaces/${workspaceId}`),
    retry: false,
  });

  if (isLoading) return <div className="grid h-full min-h-64 place-items-center text-sm text-muted-foreground">Loading workspace…</div>;
  if (error instanceof ApiError && error.status === 404) return <Navigate to="/app" replace />;
  if (!data) return <div className="p-8 text-sm text-destructive">Could not load the workspace.</div>;

  return (
    <WorkspaceContext.Provider value={{ workspace: data, can: (a) => canDo(data.role, a) }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
