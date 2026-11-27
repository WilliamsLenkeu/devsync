import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
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
import { useDialogEnter } from '@/lib/motion';
import { qk } from '@/lib/queryKeys';
import type { Invitation } from '@/lib/types';
import { INVITABLE_ROLES, isInvitable, ROLE_LABEL } from './rules';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(INVITABLE_ROLES),
});
type Values = z.infer<typeof schema>;
type EmailDelivery = 'sent' | 'skipped' | 'failed';
type InviteResult = { invitation: Invitation; token: string; emailDelivery: EmailDelivery };

const successCopy = (delivery: EmailDelivery, email: string): { title: string; description: string } => {
  if (delivery === 'sent') {
    return {
      title: 'Invitation sent',
      description: `Email sent to ${email}. Keep the one-time link below as a fallback — it expires in 7 days and will not be shown again.`,
    };
  }
  if (delivery === 'failed') {
    return {
      title: 'Email could not be sent',
      description:
        'The invitation was created, but email delivery failed. Copy the one-time link and send it yourself. It expires in 7 days.',
    };
  }
  return {
    title: 'Share this link',
    description:
      'No email provider is configured. Copy the one-time link below and send it yourself. It expires in 7 days and will not be shown again.',
  };
};

export function InviteDialog({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogEnter(panelRef, open);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'MEMBER' },
  });

  const invite = useMutation({
    mutationFn: (values: Values) =>
      api.post<InviteResult>(`/workspaces/${workspaceId}/invitations`, values),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.workspaceInvitations(workspaceId) }),
    onError: (err) => form.setError('root', { message: errorMessage(err) }),
  });

  const result = invite.data;
  const link = result && `${location.origin}/invitations/accept?token=${result.token}`;
  const copy = result && successCopy(result.emailDelivery, result.invitation.email);

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
        <Button className="bg-[#017E84] text-white hover:bg-[#016a6f]">
          <UserPlus aria-hidden />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-4 rounded-lg border-[#DEE2E6] bg-white p-0 shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:max-w-md">
        <div ref={panelRef} className="grid gap-4 p-6">
          {link && copy && result ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#212529]">{copy.title}</DialogTitle>
                <DialogDescription className="text-[#6C757D]">{copy.description}</DialogDescription>
              </DialogHeader>
              <div
                role="status"
                className="rounded-md border border-[#DEE2E6] bg-[#F8F9FA] px-3 py-2 text-sm text-[#212529]"
              >
                Anyone with this link can join as {ROLE_LABEL[result.invitation.role]}.
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={link}
                  aria-label="Invitation link"
                  className="border-[#DEE2E6] font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <CopyButton value={link} />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6]"
                  onClick={() => invite.reset()}
                >
                  Invite another
                </Button>
                <Button
                  className="bg-[#017E84] text-white hover:bg-[#016a6f]"
                  onClick={() => close(false)}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form
              onSubmit={form.handleSubmit((values) => invite.mutate(values))}
              noValidate
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="text-[#212529]">Invite a member</DialogTitle>
                <DialogDescription className="text-[#6C757D]">
                  Enter their email and role. We email the invite when delivery is configured, and
                  always show a one-time fallback link.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-sm font-medium text-[#212529]">
                  Email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="off"
                  autoFocus
                  className="border-[#DEE2E6]"
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={form.formState.errors.email ? 'invite-email-error' : undefined}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p id="invite-email-error" className="text-sm text-[#DC3545]">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role" className="text-sm font-medium text-[#212529]">
                  Role
                </Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(role) => isInvitable(role) && form.setValue('role', role)}
                >
                  <SelectTrigger id="invite-role" className="w-full border-[#DEE2E6]">
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
                <p role="alert" className="text-sm text-[#DC3545]">
                  {form.formState.errors.root.message}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  className="bg-[#017E84] text-white hover:bg-[#016a6f]"
                  disabled={invite.isPending}
                >
                  {invite.isPending ? 'Sending…' : 'Send invitation'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
