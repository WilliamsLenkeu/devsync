import { ArrowRight, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { humanize, timeAgo } from '@/lib/format';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { projectTint } from '@/components/layout/projectTint';
import { percent, ProgressBar } from './ProgressBar';

/** Carte projet Milk — tuile Material, pas une ligne de table plate. */
export function ProjectCard({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const { total, done } = project.taskCounts;
  const archived = project.status === 'ARCHIVED';
  const overview = `/w/${workspaceId}/projects/${project.id}`;
  const board = `${overview}/board`;
  const pct = percent(done, total);

  return (
    <article
      className={cn(
        'group flex flex-col rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]',
        'transition-[box-shadow,border-color] duration-200 hover:border-[#017E84]/40 hover:shadow-[0_4px_12px_rgba(0,0,0,.08)]',
      )}
    >
      <Link
        to={overview}
        className="flex flex-1 flex-col gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-[#017E84]/35 focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className={cn('mt-0.5 size-2.5 shrink-0 rounded-sm', projectTint(project.identifier))}
            />
            <span className="font-mono text-[11px] font-semibold tracking-tight text-[#017E84]">
              {project.identifier}
            </span>
            {archived ? (
              <Badge
                variant="secondary"
                className="rounded-full bg-[#E9ECEF] font-normal text-[#6C757D]"
              >
                {humanize(project.status)}
              </Badge>
            ) : null}
          </div>
          <span className="shrink-0 text-lg font-semibold tabular-nums text-[#017E84]">{pct}%</span>
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[#212529] group-hover:text-[#017E84]">
            {project.name}
          </h2>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-[#8F8F8F]">
            {project.description ?? 'No description yet'}
          </p>
        </div>

        <div className="mt-auto space-y-1.5">
          <div className="flex justify-between text-[12px] tabular-nums text-[#8F8F8F]">
            <span>
              {done} of {total} done
            </span>
            <span>Updated {timeAgo(project.updatedAt)}</span>
          </div>
          <ProgressBar done={done} total={total} />
        </div>
      </Link>

      <div className="flex items-center gap-2 border-t border-[#DEE2E6] bg-[#F8F9FA]/80 px-3 py-2">
        <Button
          asChild
          size="sm"
          className="h-8 bg-[#017E84] text-white hover:bg-[#016A6F]"
        >
          <Link to={board}>
            <LayoutGrid aria-hidden />
            Board
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8 text-[#017E84]">
          <Link to={overview}>
            Overview
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}
