import {
  hasRole,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from '@devsync/shared';
import { SearchX, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { EmptyState, ErrorState } from '@/components/states';
import { UserAvatar } from '@/components/UserAvatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth';
import { formatDate, humanize, timeAgo } from '@/lib/format';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace';
import { dateInputToIso, isoToDateInput } from './boardLogic';
import { LabelsEditor } from './LabelsEditor';
import { TaskActivity } from './TaskActivity';
import { TaskComments } from './TaskComments';
import { useProject, useProjectMembers, useTask } from './taskQueries';
import { useDeleteTask, useMoveTask, useUpdateTask, type UpdateTaskBody } from './taskMutations';

const NONE = 'none';

export function TaskDetails({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useTask(taskId);

  if (task.data) return <TaskBody key={task.data.id} task={task.data} onClose={onClose} />;

  if (task.isError) {
    return task.error instanceof ApiError && task.error.status === 404 ? (
      <div className="grid min-h-56 place-items-center p-6">
        <EmptyState
          icon={SearchX}
          title="Task not found"
          description="It may have been deleted, or you no longer have access."
          action={
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          }
        />
      </div>
    ) : (
      <div className="p-6">
        <ErrorState error={task.error} onRetry={() => void task.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 sm:p-6" aria-busy="true" aria-label="Loading task">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-4/5" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
      <p className="text-sm text-muted-foreground">Loading task…</p>
    </div>
  );
}

function TaskBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const { workspace, can } = useWorkspace();
  const user = useUser();
  const project = useProject(task.projectId);
  const members = useProjectMembers(task.projectId);
  const scope = { workspaceId: workspace.id, projectId: task.projectId };
  const update = useUpdateTask(scope);
  const move = useMoveTask(scope);
  const remove = useDeleteTask(scope);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const readOnly = !can('task:write') || project.data?.status === 'ARCHIVED';
  const canDelete =
    !readOnly &&
    (hasRole(workspace.role, 'ADMIN') ||
      task.reporter.id === user.id ||
      task.assignee?.id === user.id);
  const save = (body: UpdateTaskBody) => update.mutate({ taskId: task.id, body });

  return (
    <>
      <header className="sticky top-0 z-10 space-y-1.5 border-b border-border bg-background p-5 pr-14">
        <p className="font-mono text-xs font-medium tracking-tight text-primary">{task.key}</p>
        <TitleField value={task.title} readOnly={readOnly} onSave={(title) => save({ title })} />
      </header>

      <div className="space-y-6 p-5 pb-8">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select
              value={task.status}
              disabled={readOnly}
              onValueChange={(status) =>
                status !== task.status &&
                move.mutate({ taskId: task.id, status: status as TaskStatus, beforeTaskId: null })
              }
            >
              <SelectTrigger aria-label="Status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select
              value={task.priority}
              disabled={readOnly}
              onValueChange={(priority) => save({ priority: priority as TaskPriority })}
            >
              <SelectTrigger aria-label="Priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {humanize(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Assignee">
            <Select
              value={task.assignee?.id ?? NONE}
              disabled={readOnly}
              onValueChange={(v) => save({ assigneeId: v === NONE ? null : v })}
            >
              <SelectTrigger aria-label="Assignee" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {(members.data ?? []).map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Due date">
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                aria-label="Due date"
                className="h-9 min-w-0 flex-1"
                readOnly={readOnly}
                value={task.dueDate ? isoToDateInput(task.dueDate) : ''}
                onChange={(e) =>
                  e.target.value && save({ dueDate: dateInputToIso(e.target.value) })
                }
              />
              {task.dueDate && !readOnly && (
                <Button variant="ghost" size="sm" onClick={() => save({ dueDate: null })}>
                  Clear
                </Button>
              )}
            </div>
          </Field>
        </dl>

        <Field label="Description">
          <DescriptionField
            value={task.description}
            readOnly={readOnly}
            onSave={(description) => save({ description })}
          />
        </Field>

        <Field label="Labels">
          <LabelsEditor
            labels={task.labels}
            readOnly={readOnly}
            onChange={(labels) => save({ labels })}
          />
        </Field>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border border-border bg-muted/25 px-3 py-3 text-sm">
          <Field label="Reporter">
            <span className="flex items-center gap-2">
              <UserAvatar user={task.reporter} className="size-6" />
              <span className="truncate">{task.reporter.name}</span>
            </span>
          </Field>
          <Field label="Created">
            <span title={formatDate(task.createdAt)}>{timeAgo(task.createdAt)}</span>
          </Field>
          <Field label="Updated">
            <span>{timeAgo(task.updatedAt)}</span>
          </Field>
        </dl>

        {canDelete && (
          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden />
              Delete task
            </Button>
          </div>
        )}

        <Tabs defaultValue="comments" className="gap-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="comments">Comments ({task.commentCount})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="pt-4">
            <TaskComments taskId={task.id} scope={scope} readOnly={readOnly} />
          </TabsContent>
          <TabsContent value="activity" className="pt-4">
            <TaskActivity taskId={task.id} />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {task.key}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the task, its comments and its history for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => remove.mutate(task.id, { onSuccess: onClose })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Saves on blur / Enter, only when the value actually changed. */
function TitleField({
  value,
  readOnly,
  onSave,
}: {
  value: string;
  readOnly: boolean;
  onSave: (title: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const next = draft.trim();
    if (!next) return setDraft(value);
    if (next !== value) onSave(next);
  };
  return (
    <input
      aria-label="Title"
      value={draft}
      readOnly={readOnly}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={cn(
        '-mx-1 w-full rounded-md bg-transparent px-1 text-lg font-semibold tracking-tight text-balance outline-none',
        'motion-safe:transition-colors motion-safe:duration-150',
        'hover:bg-muted/50 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
        'read-only:hover:bg-transparent read-only:focus-visible:bg-transparent',
      )}
    />
  );
}

function DescriptionField({
  value,
  readOnly,
  onSave,
}: {
  value: string | null;
  readOnly: boolean;
  onSave: (description: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? '');
  const commit = () => {
    const next = draft.trim() || null;
    if (next !== (value?.trim() || null)) onSave(next);
  };
  return (
    <Textarea
      aria-label="Description"
      placeholder={readOnly ? 'No description' : 'Add a description…'}
      rows={4}
      value={draft}
      readOnly={readOnly}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      className="min-h-24 resize-y text-sm"
    />
  );
}
