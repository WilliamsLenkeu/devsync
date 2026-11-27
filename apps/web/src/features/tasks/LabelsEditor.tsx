import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TaskLabel } from '@/lib/types';
import type { LabelInput } from './taskMutations';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Keep it under 40 characters'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
});

const toInput = (labels: TaskLabel[]): LabelInput[] =>
  labels.map(({ name, color }) => ({ name, color }));

/** Milk Desk label pills — compact readable chips. */
export function LabelsEditor({
  labels,
  readOnly,
  onChange,
}: {
  labels: TaskLabel[];
  readOnly: boolean;
  onChange: (labels: LabelInput[]) => void;
}) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: '#017E84' },
  });

  const add = form.handleSubmit(({ name, color }) => {
    if (labels.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      form.setError('name', { message: 'This label is already set' });
      return;
    }
    onChange([...toInput(labels), { name, color }]);
    form.reset({ name: '', color });
  });

  return (
    <div className="grid gap-2.5">
      <ul className="flex flex-wrap gap-1.5">
        {labels.length === 0 && <li className="text-sm text-[#8F8F8F]">No labels yet</li>}
        {labels.map((label) => (
          <li
            key={label.id}
            className="group/label flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium"
            style={{ backgroundColor: `${label.color}22`, color: label.color }}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: label.color }}
              aria-hidden
            />
            {label.name}
            {!readOnly && (
              <button
                type="button"
                aria-label={`Remove label ${label.name}`}
                className="grid size-5 place-items-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#017E84] focus-visible:outline-none"
                onClick={() => onChange(toInput(labels.filter((l) => l.id !== label.id)))}
              >
                <X className="size-3" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <form onSubmit={add} className="flex flex-wrap items-start gap-2" noValidate>
          <div className="grid gap-1">
            <Input
              aria-label="New label name"
              placeholder="Add a label"
              className="h-8 w-40 border-[#DEE2E6]"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p role="alert" className="text-xs text-[#DC3545]">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <input
            type="color"
            aria-label="Label color"
            className="size-8 cursor-pointer rounded-md border border-[#DEE2E6] bg-transparent p-0.5"
            {...form.register('color')}
          />
          <Button type="submit" variant="outline" size="sm" className="border-[#DEE2E6]">
            Add
          </Button>
        </form>
      )}
    </div>
  );
}
