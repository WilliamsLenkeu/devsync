import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActivityItem } from '@/features/activity/ActivityItem';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/lib/workspace';
import { useProjectActivity } from './queries';

export function ProjectActivity({ projectId }: { projectId: string }) {
  const { workspace } = useWorkspace();
  const activity = useProjectActivity(projectId);
  const boardPath = `/w/${workspace.id}/projects/${projectId}/board`;

  if (activity.isPending) {
    return (
      <ul className="divide-y divide-[#DEE2E6]" aria-busy="true" aria-label="Loading activity">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-2.5 py-2.5">
            <Skeleton className="size-6 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (activity.isError)
    return <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />;

  const items = activity.data.pages.flatMap((page) => page.data);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Task, comment and member changes in this project appear here."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to={boardPath}>Open board</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <ul className="divide-y divide-[#DEE2E6]">
        {items.map((item) => (
          <ActivityItem key={item.id} activity={item} />
        ))}
      </ul>
      {activity.hasNextPage && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="border-[#DEE2E6]"
            onClick={() => void activity.fetchNextPage()}
            disabled={activity.isFetchingNextPage}
          >
            {activity.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
