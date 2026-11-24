import { ArrowLeft, Archive, ArchiveRestore, LayoutGrid, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { errorMessage } from '@/lib/api';
import { humanize } from '@/lib/format';
import type { Project } from '@/lib/types';
import { ProjectFormDialog } from './ProjectFormDialog';
import { useUpdateProject } from './queries';
import type { ProjectFormValues } from './schemas';

export function ProjectHeader({ project, canManage }: { project: Project; canManage: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const update = useUpdateProject(project.id, project.workspaceId);
  const archived = project.status === 'ARCHIVED';
  const boardPath = `/w/${project.workspaceId}/projects/${project.id}/board`;

  const onEdit = async (values: ProjectFormValues) => {
    await update.mutateAsync({ name: values.name, description: values.description || null });
    toast.success('Project updated');
  };

  const toggleArchive = () =>
    update.mutate(
      { status: archived ? 'ACTIVE' : 'ARCHIVED' },
      {
        onSuccess: () => toast.success(archived ? 'Project restored' : 'Project archived'),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <Link
          to={`/w/${project.workspaceId}/projects`}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Projects
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-tight text-foreground/70">
            {project.identifier}
          </span>
          <Badge variant={archived ? 'secondary' : 'outline'}>{humanize(project.status)}</Badge>
        </div>
        <h1 className="mt-1.5 truncate text-xl font-semibold tracking-tight text-balance">
          {project.name}
        </h1>
        {project.description ? (
          <p className="mt-1 max-w-prose text-sm text-pretty text-muted-foreground">
            {project.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button asChild>
          <Link to={boardPath}>
            <LayoutGrid aria-hidden />
            Open board
          </Link>
        </Button>
        {canManage && (
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setArchiveOpen(true)}>
              {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
              {archived ? 'Unarchive' : 'Archive'}
            </Button>
          </>
        )}
      </div>

      {canManage && (
        <>
          <ProjectFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            project={project}
            onSubmit={onEdit}
          />
          <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {archived ? 'Unarchive' : 'Archive'} “{project.name}”?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {archived
                    ? 'Tasks can be created and edited again.'
                    : 'Archived projects are read-only: tasks cannot be created or edited until it is unarchived.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={toggleArchive}>
                  {archived ? 'Unarchive' : 'Archive'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </header>
  );
}
