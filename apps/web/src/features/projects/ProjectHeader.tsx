import { ArrowLeft, Archive, ArchiveRestore, Pencil } from 'lucide-react';
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
    <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <Link
          to={`/w/${project.workspaceId}/projects`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Projects
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {project.identifier}
          </Badge>
          <Badge variant={archived ? 'secondary' : 'default'}>{humanize(project.status)}</Badge>
        </div>
        <h1 className="mt-2 truncate text-xl font-semibold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild>
          <Link to={boardPath}>Open board</Link>
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
          <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} onSubmit={onEdit} />
          <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>{archived ? 'Unarchive' : 'Archive'} “{project.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  {archived
                    ? 'Tasks can be created and edited again.'
                    : 'Archived projects are read-only: tasks cannot be created or edited until it is unarchived.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={toggleArchive}>{archived ? 'Unarchive' : 'Archive'}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </header>
  );
}
