import { useQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateWorkspaceDialog } from '@/features/workspaces/CreateWorkspaceDialog';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Workspace } from '@/lib/types';

export function WorkspaceSwitcher({
  current,
  compact = false,
}: {
  current?: Workspace;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const list = useQuery({
    queryKey: qk.workspaces,
    queryFn: () => api.get<Workspace[]>('/workspaces'),
  });
  const workspaces = list.data ?? [];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className={
              compact
                ? 'size-9 w-full justify-center border-border p-0 font-medium text-foreground shadow-none'
                : 'h-9 w-full justify-between gap-2 border-border px-2.5 font-medium text-foreground shadow-none'
            }
            aria-label={
              current ? `Workspace: ${current.name}. Switch workspace` : 'Choose a workspace'
            }
            title={compact ? (current?.name ?? 'Choose a workspace') : undefined}
            disabled={list.isPending}
          >
            {compact ? (
              <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <>
                <span className="flex min-w-0 items-center gap-2">
                  <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">
                    {list.isPending
                      ? 'Loading workspaces…'
                      : (current?.name ?? 'Choose a workspace')}
                  </span>
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 rounded-md border-border shadow-[var(--elevation-2)]"
        >
          <DropdownMenuLabel className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Workspaces
          </DropdownMenuLabel>
          {list.isError ? (
            <div className="grid gap-2 px-2 py-3" role="alert">
              <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => void list.refetch()}>
                Try again
              </Button>
            </div>
          ) : workspaces.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No workspaces yet. Create one for your team.
            </p>
          ) : (
            workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} onSelect={() => navigate(`/w/${ws.id}`)}>
                <Building2 aria-hidden />
                <span className="truncate">{ws.name}</span>
                {ws.id === current?.id && <Check className="ml-auto text-primary" aria-label="Current" />}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            Create workspace
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/app', { state: { browse: true } })}>
            All workspaces
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
