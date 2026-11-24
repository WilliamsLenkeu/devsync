import { UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/states';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { errorMessage } from '@/lib/api';
import type { ProjectMember } from '@/lib/types';
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
  useWorkspaceMembers,
} from './queries';

export function ProjectMembers({
  projectId,
  workspaceId,
  canManage,
}: {
  projectId: string;
  workspaceId: string;
  canManage: boolean;
}) {
  const members = useProjectMembers(projectId);
  const candidates = useWorkspaceMembers(workspaceId, canManage);
  const add = useAddProjectMember(projectId);
  const remove = useRemoveProjectMember(projectId);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [toRemove, setToRemove] = useState<ProjectMember | null>(null);

  const memberIds = new Set(members.data?.map((m) => m.userId));
  const addable = (candidates.data ?? []).filter((m) => !memberIds.has(m.userId));

  const onAdd = () =>
    add.mutate(selectedUserId, {
      onSuccess: () => {
        toast.success('Member added to project');
        setSelectedUserId('');
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  const onRemove = (member: ProjectMember) =>
    remove.mutate(member.userId, {
      onSuccess: () => toast.success(`${member.user.name} removed from project`),
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <section aria-labelledby="members-heading" className="h-fit">
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 id="members-heading" className="text-sm font-semibold tracking-tight">
          Members
        </h2>
        {members.data && (
          <span className="text-xs tabular-nums text-muted-foreground">{members.data.length}</span>
        )}
      </div>

      <div className="pt-2.5">
        {canManage && (
          <div className="mb-4 grid gap-2">
            <Label htmlFor="add-member">Add a workspace member</Label>
            <div className="flex gap-2">
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={addable.length === 0}
              >
                <SelectTrigger id="add-member" className="min-w-0 flex-1">
                  <SelectValue
                    placeholder={
                      addable.length === 0 ? 'Everyone is in this project' : 'Select a member'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {addable.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={onAdd}
                disabled={!selectedUserId || add.isPending}
                aria-label="Add selected member"
              >
                <UserPlus aria-hidden />
                Add
              </Button>
            </div>
          </div>
        )}

        {members.isPending && (
          <div className="divide-y" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        )}
        {members.isError && (
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        )}
        {members.data && members.data.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">No members yet.</p>
        )}
        {members.data && members.data.length > 0 && (
          <ul className="divide-y">
            {members.data.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 py-2.5">
                <UserAvatar
                  user={{ name: m.user.name, avatarUrl: m.user.avatarUrl }}
                  className="size-8"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${m.user.name} from project`}
                    onClick={() => setToRemove(m)}
                  >
                    <UserMinus aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={toRemove !== null} onOpenChange={(open) => !open && setToRemove(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toRemove?.user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their tasks in this project will be unassigned. They stay in the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toRemove) onRemove(toRemove);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
