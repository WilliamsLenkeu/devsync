import { zodResolver } from '@hookform/resolvers/zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '@devsync/shared';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { humanize } from '@/lib/format';
import type { ProjectMember } from '@/lib/types';
import { dateInputToIso, parseLabelNames } from './boardLogic';
import { prefersReducedMotion } from './milk';
import { useCreateTask, type TaskScope } from './taskMutations';

const NONE = 'none';

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Keep the title under 200 characters'),
  description: z.string().max(10000, 'Description is too long'),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: z.string(),
  dueDate: z.string(),
  labels: z.string(),
});
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  title: '',
  description: '',
  status: 'BACKLOG',
  priority: 'MEDIUM',
  assigneeId: NONE,
  dueDate: '',
  labels: '',
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  scope,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: TaskScope;
  members: ProjectMember[];
}) {
  const create = useCreateTask(scope);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || prefersReducedMotion()) return;
    const el = panelRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0.92, scale: 0.97, y: 8 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.26, ease: 'power2.out' },
      );
    }, el);
    return () => ctx.revert();
  }, [open]);

  const onSubmit = form.handleSubmit((v) =>
    create.mutate(
      {
        title: v.title,
        description: v.description.trim() || undefined,
        status: v.status,
        priority: v.priority,
        assigneeId: v.assigneeId === NONE ? undefined : v.assigneeId,
        dueDate: v.dueDate ? dateInputToIso(v.dueDate) : undefined,
        labels: parseLabelNames(v.labels).map((name) => ({ name })),
      },
      {
        onSuccess: () => {
          form.reset(EMPTY);
          onOpenChange(false);
        },
      },
    ),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(EMPTY);
        onOpenChange(next);
      }}
    >
      <DialogContent
        ref={panelRef}
        className="gap-0 border-[#DEE2E6] bg-white p-0 text-[#212529] shadow-[0_8px_28px_rgba(0,0,0,.12)] sm:max-w-lg"
      >
        <DialogHeader className="space-y-1 border-b border-[#DEE2E6] px-5 py-4">
          <DialogTitle className="text-[#212529]">New task</DialogTitle>
          <DialogDescription className="text-[#8F8F8F]">
            Numbered automatically in this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 px-5 py-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="new-task-title">Title</Label>
            <Input
              id="new-task-title"
              autoFocus
              placeholder="What needs to be done?"
              className="border-[#DEE2E6]"
              aria-invalid={!!form.formState.errors.title}
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p role="alert" className="text-xs text-[#DC3545]">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-task-description">Description</Label>
            <Textarea
              id="new-task-description"
              rows={3}
              placeholder="Optional details…"
              className="resize-y border-[#DEE2E6]"
              {...form.register('description')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Status" className="w-full border-[#DEE2E6]">
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
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <div className="grid gap-1.5">
                  <Label>Priority</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Priority" className="w-full border-[#DEE2E6]">
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
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <div className="grid gap-1.5">
                  <Label>Assignee</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Assignee" className="w-full border-[#DEE2E6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="new-task-due">Due date</Label>
              <Input
                id="new-task-due"
                type="date"
                className="border-[#DEE2E6]"
                {...form.register('dueDate')}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-task-labels">Labels</Label>
            <Input
              id="new-task-labels"
              placeholder="bug, frontend"
              className="border-[#DEE2E6]"
              {...form.register('labels')}
            />
            <p className="text-xs text-[#8F8F8F]">
              Comma-separated. Colors are assigned automatically.
            </p>
          </div>
          <DialogFooter className="-mx-5 -mb-4 border-t border-[#DEE2E6] bg-[#F8F9FA] px-5 py-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending}
              className="bg-[#017E84] text-white hover:bg-[#016A6F]"
            >
              {create.isPending ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
