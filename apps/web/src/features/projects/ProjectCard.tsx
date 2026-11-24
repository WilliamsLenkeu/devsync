import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { humanize, timeAgo } from '@/lib/format';
import type { Project } from '@/lib/types';
import { percent, ProgressBar } from './ProgressBar';

/**
 * Interactive project row (whole row is the hit target).
 * Flat band, not a card tile. Reason: list scan > equal card grid (DESIGN.md).
 */
export function ProjectCard({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const { total, done } = project.taskCounts;
  const archived = project.status === 'ARCHIVED';

  return (
    <Link
      to={`/w/${workspaceId}/projects/${project.id}`}
      className="group grid grid-cols-1 gap-2.5 border-b border-border py-3 outline-none motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent/25 focus-visible:bg-accent/35 sm:grid-cols-[minmax(0,1fr)_11rem_7rem] sm:items-center sm:gap-6"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-medium tracking-tight text-foreground/65">
            {project.identifier}
          </span>
          {archived && (
            <Badge variant="secondary" className="font-normal">
              {humanize(project.status)}
            </Badge>
          )}
        </div>
        <h2 className="mt-0.5 truncate text-sm font-semibold tracking-tight group-hover:text-primary">
          {project.name}
        </h2>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {project.description ?? 'No description'}
        </p>
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>
            {done} of {total} done
          </span>
          <span>{percent(done, total)}%</span>
        </div>
        <ProgressBar done={done} total={total} />
      </div>

      <p className="text-xs text-muted-foreground sm:text-right">Updated {timeAgo(project.updatedAt)}</p>
    </Link>
  );
}
