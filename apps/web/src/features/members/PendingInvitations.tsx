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
    <section aria-labelledby="pending-invitations" className="space-y-3">
      <div>
        <h2 id="pending-invitations" className="text-sm font-medium">
          Pending invitations
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Open invites waiting to be accepted.
        </p>
      </div>

      {invitations.isPending && (
        <div className="divide-y border-y" aria-busy="true" aria-label="Loading invitations">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      )}
      {invitations.isError && (
        <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
      )}
      {invitations.isSuccess && invitations.data.length === 0 && (
        <p className="text-sm text-muted-foreground">None right now.</p>
      )}

      {invitations.isSuccess && invitations.data.length > 0 && (
        <ul className="divide-y border-y">
          {invitations.data.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  Invited by {inv.invitedBy.name} · expires {formatDate(inv.expiresAt)}
                </p>
              </div>
              <Badge variant="outline">{ROLE_LABEL[inv.role]}</Badge>
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
