import { ActivityItem } from '@/features/activity/ActivityItem';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { useProjectActivity } from './queries';

export function ProjectActivity({ projectId }: { projectId: string }) {
  const activity = useProjectActivity(projectId);

  if (activity.isPending) return <Skeleton className="h-40" />;
  if (activity.isError)
    return <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />;

  const items = activity.data.pages.flatMap((page) => page.data);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Task, comment and member changes in this project appear here."
      />
    );
  }

  return (
    <div>
      <ul className="divide-y rounded-xl border bg-card px-4">
        {items.map((item) => (
          <ActivityItem key={item.id} activity={item} />
        ))}
      </ul>
      {activity.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
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
