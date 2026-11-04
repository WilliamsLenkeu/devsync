import { zodResolver } from '@hookform/resolvers/zod';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, errorMessage } from '@/lib/api';
import type { Project } from '@/lib/types';
import { useCreateProject } from './queries';
import { projectFormSchema, suggestIdentifier, type ProjectFormValues } from './schemas';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when provided: the identifier is immutable and not shown. */
  project?: Project;
  /** Rejections are shown in the form, so the caller must let them propagate. */
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}

export function ProjectFormDialog({ open, onOpenChange, project, onSubmit }: ProjectFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
          <DialogDescription>
            {project ? 'Update the name and description.' : 'Projects group tasks on a Kanban board.'}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm project={project} onSubmit={onSubmit} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Remounted on every open (Radix unmounts DialogContent), so the form always starts clean. */
function ProjectForm({
  project,
  onSubmit,
  onDone,
}: {
  project?: Project;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onDone: () => void;
}) {
  const identifierTouched = useRef(false);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name ?? '',
      identifier: project?.identifier ?? '',
      description: project?.description ?? '',
    },
  });

  const submit = async (values: ProjectFormValues) => {
    try {
      await onSubmit(values);
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError('identifier', { message: err.message });
      else setError('root', { message: errorMessage(err) });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'project-name-error' : undefined}
          {...register('name', {
            onChange: (e: ChangeEvent<HTMLInputElement>) => {
              if (!project && !identifierTouched.current) setValue('identifier', suggestIdentifier(e.target.value));
            },
          })}
        />
        {errors.name && (
          <p id="project-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {!project && (
        <div className="grid gap-2">
          <Label htmlFor="project-identifier">Identifier</Label>
          <Input
            id="project-identifier"
            className="font-mono"
            aria-invalid={!!errors.identifier}
            aria-describedby="project-identifier-hint project-identifier-error"
            {...register('identifier', { onChange: () => (identifierTouched.current = true) })}
          />
          <p id="project-identifier-hint" className="text-xs text-muted-foreground">
            Prefix of task keys, e.g. WEB-12. 2 to 6 uppercase letters or digits. Cannot be changed later.
          </p>
          {errors.identifier && (
            <p id="project-identifier-error" className="text-sm text-destructive">
              {errors.identifier.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="project-description">Description</Label>
        <Textarea id="project-description" rows={3} {...register('description')} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}) {
  const navigate = useNavigate();
  const create = useCreateProject(workspaceId);

  const onSubmit = async (values: ProjectFormValues) => {
    const project = await create.mutateAsync({
      name: values.name,
      identifier: values.identifier,
      description: values.description || undefined,
    });
    toast.success(`Project ${project.name} created`);
    navigate(`/w/${workspaceId}/projects/${project.id}/board`);
  };

  return <ProjectFormDialog open={open} onOpenChange={onOpenChange} onSubmit={onSubmit} />;
}
