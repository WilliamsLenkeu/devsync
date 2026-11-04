import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { humanize, timeAgo } from '@/lib/format';
import type { Project } from '@/lib/types';
import { percent, ProgressBar } from './ProgressBar';

export function ProjectCard({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const { total, done } = project.taskCounts;
  return (
    <Link
      to={`/w/${workspaceId}/projects/${project.id}`}
      className="group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="font-mono">
          {project.identifier}
        </Badge>
        <Badge variant={project.status === 'ARCHIVED' ? 'secondary' : 'default'}>
          {humanize(project.status)}
        </Badge>
      </div>
      <div className="min-w-0">
        <h2 className="truncate font-semibold group-hover:text-primary">{project.name}</h2>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {project.description ?? 'No description'}
        </p>
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {done} of {total} done
          </span>
          <span>{percent(done, total)}%</span>
        </div>
        <ProgressBar done={done} total={total} />
      </div>
      <p className="text-xs text-muted-foreground">Updated {timeAgo(project.updatedAt)}</p>
    </Link>
  );
}
