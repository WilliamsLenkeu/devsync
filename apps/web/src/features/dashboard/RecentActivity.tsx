import { Link } from 'react-router-dom';
import { ActivityItem } from '@/features/activity/ActivityItem';
import { buttonVariants } from '@/components/ui/button';
import type { Activity } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';

/** Quiet activity feed as flat rows. */
export function RecentActivity({ activity }: { activity: Activity[] }) {
  const { workspace } = useWorkspace();

  return (
    <section aria-labelledby="recent-activity-heading">
      <h2
        id="recent-activity-heading"
        className="border-b border-border pb-2 text-sm font-semibold tracking-tight"
      >
        Recent activity
      </h2>
      {activity.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-sm text-muted-foreground">No activity yet.</p>
          <Link
            to={`/w/${workspace.id}/projects`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Open a project
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {activity.map((item) => (
            <ActivityItem key={item.id} activity={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
