import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/states';
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
    mutationFn: (invitationId: string) => api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`),
    onSuccess: () => {
      toast.success('Invitation revoked');
      void qc.invalidateQueries({ queryKey: qk.workspaceInvitations(workspaceId) });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <section aria-labelledby="pending-invitations" className="space-y-3">
      <h2 id="pending-invitations" className="text-sm font-medium">
        Pending invitations
      </h2>

      {invitations.isPending && <Skeleton className="h-16 w-full" />}
      {invitations.isError && <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />}
      {invitations.isSuccess && invitations.data.length === 0 && (
        <EmptyState icon={Mail} title="No pending invitations" />
      )}

      {invitations.isSuccess && invitations.data.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {invitations.data.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
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
              The link sent to {revoking?.email} will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => revoking && revoke.mutate(revoking.id)}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
