import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CopyButton } from '@/features/api-tokens/CopyButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Invitation } from '@/lib/types';
import { INVITABLE_ROLES, isInvitable, ROLE_LABEL } from './rules';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(INVITABLE_ROLES),
});
type Values = z.infer<typeof schema>;

export function InviteDialog({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'MEMBER' },
  });

  const invite = useMutation({
    mutationFn: (values: Values) =>
      api.post<{ invitation: Invitation; token: string }>(
        `/workspaces/${workspaceId}/invitations`,
        values,
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.workspaceInvitations(workspaceId) }),
    onError: (err) => form.setError('root', { message: errorMessage(err) }),
  });

  const link = invite.data && `${location.origin}/invitations/accept?token=${invite.data.token}`;

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset();
      invite.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        {link ? (
          <>
            <DialogHeader>
              <DialogTitle>Share this link</DialogTitle>
              <DialogDescription>
                No email was sent. Copy the one-time link below and send it yourself. It expires in
                7 days and will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div
              role="status"
              className="border border-border bg-muted/25 px-3 py-2 text-sm text-foreground"
            >
              Anyone with this link can join as {ROLE_LABEL[invite.data.invitation.role]}.
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={link}
                aria-label="Invitation link"
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <CopyButton value={link} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => invite.reset()}>
                Invite another
              </Button>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={form.handleSubmit((values) => invite.mutate(values))}
            noValidate
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Invite a member</DialogTitle>
              <DialogDescription>
                Enter their email and role. You get a one-time link to share. We do not send email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                autoFocus
                aria-invalid={!!form.formState.errors.email}
                aria-describedby={form.formState.errors.email ? 'invite-email-error' : undefined}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p id="invite-email-error" className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(role) => isInvitable(role) && form.setValue('role', role)}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.formState.errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? 'Creating…' : 'Create invitation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
