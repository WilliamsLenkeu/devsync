import { Link } from 'react-router-dom';
import { InlineNotice } from '@/components/feedback';
import { ProgressBar, percent } from '@/features/projects/ProgressBar';
import type { Dashboard } from '@/lib/types';

/** Milk Desk progress card — one dense row per project. */
export function ProjectProgressList({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: Dashboard['projectProgress'];
}) {
  return (
    <section
      aria-labelledby="progress-heading"
      className="rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <h2
        id="progress-heading"
        className="border-b border-[#DEE2E6] px-4 py-2.5 text-sm font-semibold text-[#212529]"
      >
        Project progress
      </h2>
      {projects.length === 0 ? (
        <div className="p-3">
          <InlineNotice
            tone="info"
            title="No projects yet"
            description="Create a project to track completion here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-[#DEE2E6]">
          {projects.map((p) => (
            <li key={p.projectId} data-stagger-item className="px-4 py-3 hover:bg-[#F8F9FA]">
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <Link
                  to={`/w/${workspaceId}/projects/${p.projectId}`}
                  className="min-w-0 truncate font-medium text-[#212529] hover:text-[#017E84] hover:underline"
                >
                  <span className="mr-1.5 font-mono text-[11px] font-medium text-[#6C757D]">
                    {p.identifier}
                  </span>
                  {p.name}
                </Link>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#6C757D]">
                  {p.done}/{p.total} · {percent(p.done, p.total)}%
                </span>
              </div>
              <ProgressBar done={p.done} total={p.total} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
