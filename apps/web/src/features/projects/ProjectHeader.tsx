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
import { humanize, timeAgo } from '@/lib/format';
import type { Project } from '@/lib/types';
import { ProjectFormDialog } from './ProjectFormDialog';
import { useUpdateProject } from './queries';
import type { ProjectFormValues } from './schemas';

/** Control panel Milk/Odoo : sticky, 1 primary Open board, Edit/Archive secondaires. */
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
    <header className="sticky top-0 z-20 border-b border-[#DEE2E6] bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link
            to={`/w/${project.workspaceId}/projects`}
            className="inline-flex min-h-8 items-center gap-1 text-[13px] text-[#8F8F8F] hover:text-[#212529]"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Projects
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-tight text-[#017E84]">
              {project.identifier}
            </span>
            <Badge
              variant={archived ? 'secondary' : 'outline'}
              className={
                archived
                  ? 'rounded-full bg-[#E9ECEF] font-normal text-[#6C757D]'
                  : 'rounded-full border-[#017E84]/30 font-normal text-[#017E84]'
              }
            >
              {humanize(project.status)}
            </Badge>
            <span className="text-[12px] text-[#8F8F8F]">Updated {timeAgo(project.updatedAt)}</span>
          </div>
          <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-[#212529] text-balance">
            {project.name}
          </h1>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild className="bg-[#017E84] text-white hover:bg-[#016A6F]">
            <Link to={boardPath}>
              <LayoutGrid aria-hidden />
              Open board
            </Link>
          </Button>
          {canManage ? (
            <>
              <Button
                variant="outline"
                className="border-[#DEE2E6] bg-[#E9ECEF] text-[#212529]"
                onClick={() => setEditOpen(true)}
              >
                <Pencil aria-hidden />
                Edit
              </Button>
              <Button
                variant="outline"
                className="border-[#DEE2E6]"
                onClick={() => setArchiveOpen(true)}
              >
                {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                {archived ? 'Unarchive' : 'Archive'}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canManage ? (
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
      ) : null}
    </header>
  );
}
