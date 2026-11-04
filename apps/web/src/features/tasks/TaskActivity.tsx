import { Activity } from 'lucide-react';
import { ActivityItem } from '@/features/activity/ActivityItem';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTaskActivity } from './taskQueries';

export function TaskActivity({ taskId }: { taskId: string }) {
  const activity = useTaskActivity(taskId);

  if (activity.isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (activity.isError) {
    return <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />;
  }

  const items = activity.data.pages.flatMap((page) => page.data);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Edits, moves and comments on this task appear here."
      />
    );
  }

  return (
    <div>
      <ul className="divide-y">
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
