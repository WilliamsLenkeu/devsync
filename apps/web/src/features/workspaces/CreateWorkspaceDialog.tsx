import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FormAlert } from '@/features/auth/Field';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Workspace } from '@/lib/types';

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters').max(60, 'Use 60 characters or fewer'),
  description: z.string().trim().max(280, 'Use 280 characters or fewer'),
});
type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const ws = await api.post<Workspace>('/workspaces', {
        name: values.name,
        description: values.description || undefined,
      });
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      reset();
      onOpenChange(false);
      toast.success(`Workspace "${ws.name}" created`);
      navigate(`/w/${ws.id}`);
    } catch (err) {
      setError('root', { message: errorMessage(err, 'Could not create the workspace') });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            A workspace holds your projects, members and API tokens.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {errors.root && (
            <FormAlert message={errors.root.message ?? 'Could not create the workspace'} />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
