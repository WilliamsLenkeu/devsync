import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { PageHeader } from '@/components/states';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FormAlert } from '@/features/auth/Field';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Workspace } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Use 80 characters or fewer'),
  description: z.string().trim().max(500, 'Use 500 characters or fewer'),
});
type Values = z.infer<typeof schema>;

/**
 * Design Read: workspace admin strip, signal-console,
 * dial ENERGY 2 / RHYTHM 2 / MOTION 1.
 * Job: rename, then (clearly separated) destroy. Form group + danger band.
 */
export function WorkspaceSettingsPage() {
  useDocumentTitle('Workspace settings');
  const { workspace, can } = useWorkspace();

  return (
    <div className="mx-auto grid max-w-2xl gap-10 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Workspace settings"
        description="Name, description, and irreversible actions."
      />
      {can('workspace:update') && <GeneralForm workspace={workspace} />}
      {can('workspace:delete') && <DangerZone workspace={workspace} />}
    </div>
  );
}

function GeneralForm({ workspace }: { workspace: Workspace }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { name: workspace.name, description: workspace.description ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await api.patch<Workspace>(`/workspaces/${workspace.id}`, {
        name: values.name,
        description: values.description || null,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.workspace(workspace.id) }),
        qc.invalidateQueries({ queryKey: qk.workspaces }),
      ]);
      reset({ name: updated.name, description: updated.description ?? '' });
      toast.success('Workspace updated');
    } catch (err) {
      setError('root', { message: errorMessage(err, 'Could not update the workspace') });
    }
  });

  return (
    <section aria-labelledby="ws-general" className="grid gap-5 border border-border p-5">
      <div>
        <h2 id="ws-general" className="text-sm font-semibold tracking-tight">
          General
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The slug is fixed after creation.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {errors.root && (
          <FormAlert message={errors.root.message ?? 'Could not update the workspace'} />
        )}
        <Field id="ws-name" label="Name" error={errors.name?.message}>
          <Input
            id="ws-name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'ws-name-error' : undefined}
            {...register('name')}
          />
        </Field>
        <Field
          id="ws-description"
          label="Description (optional)"
          error={errors.description?.message}
        >
          <Textarea
            id="ws-description"
            rows={3}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'ws-description-error' : undefined}
            {...register('description')}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Slug: <span className="font-mono text-foreground">{workspace.slug}</span>
        </p>
        <div>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save workspace'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function DangerZone({ workspace }: { workspace: Workspace }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [confirmName, setConfirmName] = useState('');
  const [open, setOpen] = useState(false);
  const matches = confirmName === workspace.name;

  const remove = useMutation({
    mutationFn: () => api.delete(`/workspaces/${workspace.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      toast.success(`Deleted ${workspace.name}`);
      navigate('/app', { replace: true });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <section aria-labelledby="ws-danger" className="grid gap-4">
      <div className="border-t border-destructive/40 pt-8">
        <h2 id="ws-danger" className="text-sm font-semibold tracking-tight text-destructive">
          Danger zone
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Permanently delete this workspace, its projects, tasks, and tokens. This cannot be undone.
        </p>
      </div>
      <div className="flex flex-col gap-4 border border-destructive bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          Delete <span className="font-medium">{workspace.name}</span> and all of its data.
        </p>
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setConfirmName('');
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="shrink-0">
              Delete workspace
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {workspace.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Type <span className="font-medium text-foreground">{workspace.name}</span> to confirm
                permanent deletion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              aria-label="Workspace name confirmation"
              autoComplete="off"
              autoFocus
              placeholder={workspace.name}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={!matches || remove.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  remove.mutate();
                }}
              >
                {remove.isPending ? 'Deleting…' : 'Delete forever'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
