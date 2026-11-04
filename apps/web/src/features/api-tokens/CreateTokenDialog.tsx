import { API_TOKEN_SCOPES, type ApiTokenScope } from '@devsync/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CopyButton } from '@/features/api-tokens/CopyButton';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { ApiToken } from '@/lib/types';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  scopes: z.array(z.enum(API_TOKEN_SCOPES)).min(1, 'Pick at least one scope'),
  expiresInDays: z.string(),
});
type Values = z.infer<typeof schema>;

const DEFAULT_SCOPES: ApiTokenScope[] = ['workspaces:read', 'projects:read', 'tasks:read', 'activity:read'];

export function CreateTokenDialog({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', scopes: DEFAULT_SCOPES, expiresInDays: '' },
  });

  const create = useMutation({
    mutationFn: (values: Values) => {
      const days = values.expiresInDays.trim() === '' ? undefined : Number(values.expiresInDays);
      return api.post<{ token: ApiToken; secret: string }>(`/workspaces/${workspaceId}/api-tokens`, {
        name: values.name,
        scopes: values.scopes,
        ...(days !== undefined && Number.isFinite(days) ? { expiresInDays: days } : {}),
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.apiTokens(workspaceId) }),
    onError: (err) => form.setError('root', { message: errorMessage(err) }),
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset();
      create.reset();
    }
  };

  const secret = create.data?.secret;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>
          <KeyRound aria-hidden />
          Create token
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>Token created</DialogTitle>
              <DialogDescription>
                Copy this secret now. It will not be shown again — only a SHA-256 hash is stored.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={secret}
                aria-label="API token secret"
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <CopyButton value={secret} />
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
            noValidate
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Create API token</DialogTitle>
              <DialogDescription>
                Scoped for agents and the MCP server. Effective rights are scope AND your workspace role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="token-name">Name</Label>
              <Input
                id="token-name"
                autoFocus
                aria-invalid={!!form.formState.errors.name}
                aria-describedby={form.formState.errors.name ? 'token-name-error' : undefined}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p id="token-name-error" className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Scopes</legend>
              <Controller
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {API_TOKEN_SCOPES.map((scope) => {
                      const checked = field.value.includes(scope);
                      return (
                        <li key={scope} className="flex items-center gap-2">
                          <Checkbox
                            id={`scope-${scope}`}
                            checked={checked}
                            onCheckedChange={(v) =>
                              field.onChange(
                                v === true ? [...field.value, scope] : field.value.filter((s) => s !== scope),
                              )
                            }
                          />
                          <Label htmlFor={`scope-${scope}`} className="font-mono text-xs font-normal">
                            {scope}
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              />
              {form.formState.errors.scopes && (
                <p className="text-sm text-destructive">{form.formState.errors.scopes.message}</p>
              )}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="token-expiry">Expires in days (optional)</Label>
              <Input
                id="token-expiry"
                type="number"
                min={1}
                max={365}
                placeholder="Never"
                {...form.register('expiresInDays')}
              />
            </div>
            {form.formState.errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create token'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
