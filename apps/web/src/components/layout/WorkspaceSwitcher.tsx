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
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Workspace } from '@/lib/types';

export function WorkspaceSwitcher({ current }: { current?: Workspace }) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: workspaces = [] } = useQuery({
    queryKey: qk.workspaces,
    queryFn: () => api.get<Workspace[]>('/workspaces'),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 w-full justify-between px-2 font-medium">
            <span className="sr-only">Current workspace:</span>
            <span className="truncate">{current?.name ?? 'Choose a workspace'}</span>
            <ChevronsUpDown className="ml-auto text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((ws) => (
            <DropdownMenuItem key={ws.id} onSelect={() => navigate(`/w/${ws.id}`)}>
              <Building2 aria-hidden />
              <span className="truncate">{ws.name}</span>
              {ws.id === current?.id && <Check className="ml-auto" aria-label="Current" />}
            </DropdownMenuItem>
          ))}
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
