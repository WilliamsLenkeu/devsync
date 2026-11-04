import { hasRole } from '@devsync/shared';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState } from '@/components/states';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import type { Comment, Member } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';
import { insertMention, mentionQuery, parseMentions } from './mentions';
import { useCreateComment, useDeleteComment, type TaskScope } from './taskMutations';
import { useComments, useWorkspaceMembers } from './taskQueries';

export function TaskComments({
  taskId,
  scope,
  readOnly,
}: {
  taskId: string;
  scope: TaskScope;
  readOnly: boolean;
}) {
  const comments = useComments(taskId);
  const members = useWorkspaceMembers(scope.workspaceId);
  const create = useCreateComment(scope);
  const remove = useDeleteComment(scope);
  const { workspace } = useWorkspace();
  const user = useUser();
  const canWrite = !readOnly;

  if (comments.isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading comments">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (comments.isError) {
    return <ErrorState error={comments.error} onRetry={() => void comments.refetch()} />;
  }

  const list = comments.data;
  const canDelete = (c: Comment) => c.author.id === user.id || hasRole(workspace.role, 'ADMIN');

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description={canWrite ? 'Mention teammates with @name.' : 'Nothing here yet.'}
        />
      ) : (
        <ul className="space-y-4">
          {list.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <UserAvatar user={comment.author} className="mt-0.5 size-7" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
                    {timeAgo(comment.createdAt)}
                  </time>
                  {canDelete(comment) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto text-muted-foreground"
                      aria-label="Delete comment"
                      onClick={() => remove.mutate({ commentId: comment.id, taskId })}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
                <CommentBody body={comment.body} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <CommentComposer
          members={members.data ?? []}
          pending={create.isPending}
          onSubmit={(body, done) => create.mutate({ taskId, body }, { onSuccess: () => done() })}
        />
      )}
    </div>
  );
}

function CommentBody({ body }: { body: string }) {
  return (
    <p className="mt-1 text-sm text-pretty whitespace-pre-wrap">
      {parseMentions(body).map((seg, i) =>
        seg.kind === 'mention' ? (
          <span key={i} className="rounded bg-primary/10 px-0.5 font-medium text-primary">
            @{seg.name}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  );
}

function CommentComposer({
  members,
  pending,
  onSubmit,
}: {
  members: Member[];
  pending: boolean;
  onSubmit: (body: string, done: () => void) => void;
}) {
  const [body, setBody] = useState('');
  const query = mentionQuery(body);
  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members.filter((m) => !q || m.user.name.toLowerCase().includes(q)).slice(0, 6);
  }, [members, query]);

  const submit = () => {
    const next = body.trim();
    if (!next || pending) return;
    onSubmit(next, () => setBody(''));
  };

  return (
    <div className="relative grid gap-2">
      <Textarea
        aria-label="New comment"
        placeholder="Write a comment… Use @ to mention"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention suggestions"
          className="absolute bottom-full left-0 z-10 mb-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((m) => (
            <li key={m.userId}>
              <button
                type="button"
                role="option"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={() => setBody(insertMention(body, m.user))}
              >
                <UserAvatar user={m.user} className="size-5" />
                {m.user.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Ctrl/⌘+Enter to send</p>
        <Button type="button" size="sm" disabled={!body.trim() || pending} onClick={submit}>
          {pending ? 'Posting…' : 'Comment'}
        </Button>
      </div>
    </div>
  );
}
