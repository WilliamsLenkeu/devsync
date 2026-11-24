import { useQuery } from '@tanstack/react-query';
import { UserAvatar } from '@/components/UserAvatar';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Member } from '@/lib/types';
import { usePresence } from './RealtimeProvider';

const MAX_SHOWN = 5;

/** Avatars of the members currently online in the workspace. */
export function PresenceStack({ workspaceId }: { workspaceId: string }) {
  const online = usePresence(workspaceId);
  const { data: members = [] } = useQuery({
    queryKey: qk.members(workspaceId),
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
  });
  const onlineMembers = members.filter((m) => online.includes(m.userId));
  if (onlineMembers.length === 0) return null;

  const shown = onlineMembers.slice(0, MAX_SHOWN);
  const hidden = onlineMembers.length - shown.length;
  return (
    <ul
      aria-label={`${onlineMembers.length} online`}
      className="flex items-center -space-x-2"
      title={onlineMembers.map((m) => m.user.name).join(', ')}
    >
      {shown.map((m) => (
        <li key={m.userId} title={m.user.name}>
          <UserAvatar user={m.user} className="size-7 ring-2 ring-background" />
        </li>
      ))}
      {hidden > 0 && (
        <li
          className="grid size-7 place-items-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background"
          title={`${hidden} more online`}
        >
          +{hidden}
        </li>
      )}
    </ul>
  );
}
