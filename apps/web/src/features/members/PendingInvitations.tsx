import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import type { Invitation } from '@/lib/types';
import { ROLE_LABEL } from './rules';

export function PendingInvitations({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const invitations = useQuery({
    queryKey: qk.workspaceInvitations(workspaceId),
    queryFn: () => api.get<Invitation[]>(`/workspaces/${workspaceId}/invitations`),
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`),
    onSuccess: () => {
      toast.success('Invitation revoked');
      void qc.invalidateQueries({ queryKey: qk.workspaceInvitations(workspaceId) });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <section
      aria-labelledby="pending-invitations"
      className="rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="border-b border-[#DEE2E6] px-4 py-3">
        <h2 id="pending-invitations" className="text-sm font-semibold text-[#212529]">
          Pending invitations
        </h2>
        <p className="mt-0.5 text-sm text-[#6C757D]">Open invites waiting to be accepted.</p>
      </div>

      {invitations.isPending && (
        <div className="divide-y divide-[#DEE2E6]" aria-busy="true" aria-label="Loading invitations">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      )}
      {invitations.isError && (
        <div className="p-4">
          <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
        </div>
      )}
      {invitations.isSuccess && invitations.data.length === 0 && (
        <p className="px-4 py-4 text-sm text-[#6C757D]">None right now — invite someone above.</p>
      )}

      {invitations.isSuccess && invitations.data.length > 0 && (
        <ul className="divide-y divide-[#DEE2E6]">
          {invitations.data.map((inv) => (
            <li
              key={inv.id}
              data-stagger-item
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8F9FA]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#212529]">{inv.email}</p>
                <p className="text-xs text-[#6C757D]">
                  Invited by {inv.invitedBy.name} · expires {formatDate(inv.expiresAt)}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-transparent bg-[#E9ECEF] font-normal text-[#495057]"
              >
                {ROLE_LABEL[inv.role]}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Revoke invitation for ${inv.email}`}
                onClick={() => setRevoking(inv)}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The link for {revoking?.email} will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => revoking && revoke.mutate(revoking.id)}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
