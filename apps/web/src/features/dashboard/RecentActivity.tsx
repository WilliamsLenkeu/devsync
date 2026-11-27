import { Link } from 'react-router-dom';
import { ActivityItem } from '@/features/activity/ActivityItem';
import { buttonVariants } from '@/components/ui/button';
import type { Activity } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace';

/** Milk Desk activity card — flat dense rows. */
export function RecentActivity({ activity }: { activity: Activity[] }) {
  const { workspace } = useWorkspace();

  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <h2
        id="recent-activity-heading"
        className="border-b border-[#DEE2E6] px-4 py-2.5 text-sm font-semibold text-[#212529]"
      >
        Recent activity
      </h2>
      {activity.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5">
          <p className="text-sm text-[#6C757D]">
            No activity yet. Open a project and start moving work.
          </p>
          <Link
            to={`/w/${workspace.id}/projects`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6]',
            )}
          >
            Open a project
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[#DEE2E6]">
          {activity.map((item) => (
            <li key={item.id} data-stagger-item className="px-2 hover:bg-[#F8F9FA]">
              <ActivityItem activity={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
