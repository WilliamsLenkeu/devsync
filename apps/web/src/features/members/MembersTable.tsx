import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkspaceRole } from '@devsync/shared';
import { LogOut, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserAvatar } from '@/components/UserAvatar';
import { api, errorMessage } from '@/lib/api';
import { useUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import type { Member } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';
import {
  assignableRoles,
  canChangeRole,
  canRemoveMember,
  isWorkspaceRole,
  ROLE_LABEL,
} from './rules';

export function MembersTable({ members }: { members: Member[] }) {
  const { workspace, can } = useWorkspace();
  const me = useUser();
  const wid = workspace.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [removing, setRemoving] = useState<Member | null>(null);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.members(wid) }),
      qc.invalidateQueries({ queryKey: qk.workspace(wid) }),
      qc.invalidateQueries({ queryKey: qk.workspaces }),
    ]);

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      api.patch<Member>(`/workspaces/${wid}/members/${userId}`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      void refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => api.delete(`/workspaces/${wid}/members/${userId}`),
    onSuccess: (_, userId) => {
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      if (userId === me.id) {
        toast.success(`You left ${workspace.name}`);
        navigate('/app', { replace: true });
        return;
      }
      toast.success('Member removed');
      void refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[#DEE2E6] bg-[#F8F9FA] hover:bg-[#F8F9FA]">
              <TableHead className="h-9 text-xs font-medium text-[#6C757D]">Member</TableHead>
              <TableHead className="h-9 text-xs font-medium text-[#6C757D]">Role</TableHead>
              <TableHead className="hidden h-9 text-xs font-medium text-[#6C757D] sm:table-cell">
                Joined
              </TableHead>
              <TableHead className="h-9 w-0">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isMe = m.userId === me.id;
              const editable = canChangeRole(workspace.role, m, members);
              const removable = canRemoveMember(workspace.role, m, members, me.id);
              return (
                <TableRow
                  key={m.userId}
                  data-stagger-item
                  className="border-[#DEE2E6] hover:bg-[#F8F9FA]"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={m.user} className="size-8 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#212529]">
                          {m.user.name}
                          {isMe && (
                            <span className="ml-1.5 text-xs font-normal text-[#6C757D]">(you)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[#6C757D]">{m.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <Select
                        value={m.role}
                        disabled={setRole.isPending}
                        onValueChange={(role) => {
                          if (isWorkspaceRole(role)) setRole.mutate({ userId: m.userId, role });
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-32 border-[#DEE2E6]"
                          aria-label={`Role of ${m.user.name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles(workspace.role).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-transparent bg-[#E9ECEF] font-normal text-[#495057]"
                      >
                        {ROLE_LABEL[m.role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm tabular-nums text-[#6C757D] sm:table-cell">
                    {formatDate(m.joinedAt)}
                  </TableCell>
                  <TableCell>
                    {isMe && removable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6]"
                        onClick={() => setRemoving(m)}
                      >
                        <LogOut aria-hidden />
                        Leave
                      </Button>
                    )}
                    {!isMe && removable && can('member:remove') && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${m.user.name}`}
                        onClick={() => setRemoving(m)}
                      >
                        <UserMinus aria-hidden />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removing?.userId === me.id
                ? `Leave ${workspace.name}?`
                : `Remove ${removing?.user.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.userId === me.id
                ? 'You will lose access to this workspace and its projects. Your assigned tasks will be unassigned.'
                : `${removing?.user.name} will lose access. Their assigned tasks will be unassigned.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removing && remove.mutate(removing.userId)}
            >
              {removing?.userId === me.id ? 'Leave workspace' : 'Remove member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
