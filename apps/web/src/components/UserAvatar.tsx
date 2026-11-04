import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export function UserAvatar({
  user,
  className,
}: {
  user: { name: string; avatarUrl: string | null };
  className?: string;
}) {
  return (
    <Avatar className={cn('size-6 text-[10px]', className)} title={user.name}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback className="bg-accent font-medium text-accent-foreground">{initials(user.name)}</AvatarFallback>
    </Avatar>
  );
}
