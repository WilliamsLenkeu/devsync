import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityItem } from '@/features/activity/ActivityItem';
import type { Activity } from '@/lib/types';

export function RecentActivity({ activity }: { activity: Activity[] }) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader>
        <CardTitle className="text-sm">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y">
            {activity.map((item) => (
              <li key={item.id} className="py-2.5">
                <ActivityItem activity={item} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
