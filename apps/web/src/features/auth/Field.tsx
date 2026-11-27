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
      <Label htmlFor={id} className="text-sm font-medium text-[#212529]">
        {label}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-[#DC3545]">
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
      className="rounded-md border border-[#DC3545]/35 bg-[#DC3545]/8 px-3 py-2 text-sm leading-snug text-[#DC3545]"
    >
      {message}
    </p>
  );
}
