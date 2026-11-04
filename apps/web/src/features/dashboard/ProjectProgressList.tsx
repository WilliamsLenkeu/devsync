import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar, percent } from '@/features/projects/ProgressBar';
import type { Dashboard } from '@/lib/types';

export function ProjectProgressList({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: Dashboard['projectProgress'];
}) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader>
        <CardTitle className="text-sm">Project progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {projects.map((p) => (
            <li key={p.projectId}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <Link
                  to={`/w/${workspaceId}/projects/${p.projectId}`}
                  className="min-w-0 truncate font-medium hover:text-primary hover:underline"
                >
                  <span className="font-mono text-xs text-muted-foreground">{p.identifier}</span> {p.name}
                </Link>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {p.done}/{p.total} · {percent(p.done, p.total)}%
                </span>
              </div>
              <ProgressBar done={p.done} total={p.total} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
