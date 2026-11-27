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
import { cn } from '@/lib/utils';
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
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
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
        <ul className="divide-y divide-[#DEE2E6] border-y border-[#DEE2E6]">
          {list.map((comment) => (
            <li
              key={comment.id}
              className="group flex gap-3 px-1 py-2.5 hover:bg-[#F8F9FA]"
            >
              <UserAvatar user={comment.author} className="mt-0.5 size-7" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-[#212529]">{comment.author.name}</span>
                  <time dateTime={comment.createdAt} className="text-xs text-[#8F8F8F]">
                    {timeAgo(comment.createdAt)}
                  </time>
                  {canDelete(comment) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto text-[#8F8F8F] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
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
    <p className="mt-1 text-sm text-[#212529] text-pretty whitespace-pre-wrap">
      {parseMentions(body).map((seg, i) =>
        seg.kind === 'mention' ? (
          <span
            key={i}
            className="rounded-sm bg-[#017E84]/12 px-1 py-0.5 font-medium text-[#017E84]"
          >
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
  const [activeIdx, setActiveIdx] = useState(0);
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

  const pick = (member: Member) => {
    setBody(insertMention(body, member.user));
    setActiveIdx(0);
  };

  return (
    <div className="relative grid gap-2 rounded-lg border border-[#DEE2E6] bg-[#F8F9FA] p-3 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      <Textarea
        aria-label="New comment"
        placeholder="Write a comment… Use @ to mention"
        rows={3}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setActiveIdx(0);
        }}
        onKeyDown={(e) => {
          if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((i) => (i + 1) % suggestions.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              pick(suggestions[activeIdx]!);
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setBody((b) => b.replace(/@[\w.-]*$/, ''));
              return;
            }
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        className="min-h-20 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
      />
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention suggestions"
          className="absolute bottom-full left-0 z-10 mb-1 max-h-48 w-full overflow-auto rounded-lg border border-[#DEE2E6] bg-white p-1 shadow-[0_4px_12px_rgba(0,0,0,.1)]"
        >
          {suggestions.map((m, i) => (
            <li key={m.userId}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-none',
                  i === activeIdx ? 'bg-[#017E84]/10 text-[#017E84]' : 'hover:bg-[#F8F9FA]',
                )}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pick(m)}
              >
                <UserAvatar user={m.user} className="size-5" />
                <span className="truncate">{m.user.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-[#DEE2E6] pt-2">
        <p className="text-xs text-[#8F8F8F]">Ctrl/⌘+Enter to send</p>
        <Button
          type="button"
          size="sm"
          disabled={!body.trim() || pending}
          className="bg-[#017E84] text-white hover:bg-[#016A6F]"
          onClick={submit}
        >
          {pending ? 'Posting…' : 'Comment'}
        </Button>
      </div>
    </div>
  );
}
