import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

/** Label + inline error. Callers set `aria-invalid` / `aria-describedby="<id>-error"` on the control. */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/35 bg-destructive/8 px-3 py-2.5 text-sm leading-snug text-destructive"
    >
      {message}
    </p>
  );
}
