import { toast } from 'sonner';

type NotifyOptions = {
  description?: string;
  duration?: number;
  id?: string | number;
};

/**
 * Milk Desk toast API — thin typed wrapper over Sonner.
 * Prefer this over importing `toast` from `sonner` in feature code.
 */
export const notify = {
  info: (title: string, opts?: NotifyOptions) =>
    toast.info(title, { description: opts?.description, duration: opts?.duration, id: opts?.id }),
  success: (title: string, opts?: NotifyOptions) =>
    toast.success(title, {
      description: opts?.description,
      duration: opts?.duration,
      id: opts?.id,
    }),
  warning: (title: string, opts?: NotifyOptions) =>
    toast.warning(title, {
      description: opts?.description,
      duration: opts?.duration,
      id: opts?.id,
    }),
  error: (title: string, opts?: NotifyOptions) =>
    toast.error(title, {
      description: opts?.description,
      duration: opts?.duration ?? 6_000,
      id: opts?.id,
    }),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
