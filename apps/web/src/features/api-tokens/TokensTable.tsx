import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import type { ApiToken } from '@/lib/types';

export function TokensTable({ workspaceId, tokens }: { workspaceId: string; tokens: ApiToken[] }) {
  const qc = useQueryClient();
  const [revoking, setRevoking] = useState<ApiToken | null>(null);

  const revoke = useMutation({
    mutationFn: (tokenId: string) => api.delete(`/api-tokens/${tokenId}`),
    onSuccess: () => {
      toast.success('Token revoked');
      void qc.invalidateQueries({ queryKey: qk.apiTokens(workspaceId) });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const active = tokens.filter((t) => !t.revokedAt);

  return (
    <>
      <div className="overflow-x-auto border-y">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-xs text-muted-foreground">Name</TableHead>
              <TableHead className="hidden h-9 text-xs text-muted-foreground md:table-cell">
                Scopes
              </TableHead>
              <TableHead className="hidden h-9 text-xs text-muted-foreground sm:table-cell">
                Created
              </TableHead>
              <TableHead className="hidden h-9 text-xs text-muted-foreground lg:table-cell">
                Last used
              </TableHead>
              <TableHead className="h-9 w-0">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {t.prefix}…
                    {t.expiresAt ? ` · expires ${formatDate(t.expiresAt)}` : ' · never expires'}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <ul className="flex flex-wrap gap-1">
                    {t.scopes.map((s) => (
                      <li key={s}>
                        <Badge variant="outline" className="font-mono text-[10px] font-normal">
                          {s}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground tabular-nums sm:table-cell">
                  {formatDate(t.createdAt)}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {t.lastUsedAt ? timeAgo(t.lastUsedAt) : 'Never'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Revoke ${t.name}`}
                    onClick={() => setRevoking(t)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this token loses access immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => revoking && revoke.mutate(revoking.id)}
            >
              Revoke token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
