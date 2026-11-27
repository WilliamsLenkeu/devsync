import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Milk Desk toaster — teal-aligned surfaces, shared by `notify.*`. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      closeButton
      richColors={false}
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#28A745]" />,
        info: <InfoIcon className="size-4 text-[#17A2B8]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#F0AD4E]" />,
        error: <OctagonXIcon className="size-4 text-[#DC3545]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#017E84]" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast border border-[#DEE2E6] bg-white text-[#212529] shadow-[0_4px_12px_rgba(0,0,0,.1)]',
          title: 'text-sm font-semibold text-[#212529]',
          description: 'text-[13px] text-[#6C757D]',
          actionButton: 'bg-[#017E84] text-white',
          cancelButton: 'bg-[#E9ECEF] text-[#212529]',
          closeButton: 'border-[#DEE2E6] bg-white text-[#6C757D]',
          success: 'border-l-4 border-l-[#28A745]',
          info: 'border-l-4 border-l-[#17A2B8]',
          warning: 'border-l-4 border-l-[#F0AD4E]',
          error: 'border-l-4 border-l-[#DC3545]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
