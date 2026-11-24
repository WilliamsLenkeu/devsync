import { Link } from 'react-router-dom';
import { ProgressBar, percent } from '@/features/projects/ProgressBar';
import type { Dashboard } from '@/lib/types';

/** Compact progress band: one row per project, no card chrome. */
export function ProjectProgressList({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: Dashboard['projectProgress'];
}) {
  return (
    <section aria-labelledby="progress-heading">
      <h2
        id="progress-heading"
        className="border-b border-border pb-2 text-sm font-semibold tracking-tight"
      >
        Project progress
      </h2>
      <ul className="divide-y divide-border">
        {projects.map((p) => (
          <li key={p.projectId} className="py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <Link
                to={`/w/${workspaceId}/projects/${p.projectId}`}
                className="min-w-0 truncate font-medium hover:text-primary hover:underline"
              >
                <span className="mr-1.5 font-mono text-[11px] font-medium tracking-tight text-foreground/65">
                  {p.identifier}
                </span>
                {p.name}
              </Link>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                {p.done}/{p.total} · {percent(p.done, p.total)}%
              </span>
            </div>
            <ProgressBar done={p.done} total={p.total} />
          </li>
        ))}
      </ul>
    </section>
  );
}
