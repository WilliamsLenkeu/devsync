import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, Info, OctagonX } from 'lucide-react';

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';

export const NOTICE_ICON: Record<NoticeTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: OctagonX,
};

/** Milk Desk surface tokens for banners / dialogs / toasts. */
export const NOTICE_SURFACE: Record<
  NoticeTone,
  { bar: string; bg: string; border: string; ink: string; icon: string }
> = {
  info: {
    bar: 'bg-[#17A2B8]',
    bg: 'bg-[#D1ECF1]',
    border: 'border-[#BEE5EB]',
    ink: 'text-[#0C5460]',
    icon: 'text-[#17A2B8]',
  },
  success: {
    bar: 'bg-[#28A745]',
    bg: 'bg-[#D4EDDA]',
    border: 'border-[#C3E6CB]',
    ink: 'text-[#155724]',
    icon: 'text-[#28A745]',
  },
  warning: {
    bar: 'bg-[#F0AD4E]',
    bg: 'bg-[#FFF3CD]',
    border: 'border-[#FFEEBA]',
    ink: 'text-[#856404]',
    icon: 'text-[#F0AD4E]',
  },
  error: {
    bar: 'bg-[#DC3545]',
    bg: 'bg-[#F8D7DA]',
    border: 'border-[#F5C6CB]',
    ink: 'text-[#721C24]',
    icon: 'text-[#DC3545]',
  },
};
