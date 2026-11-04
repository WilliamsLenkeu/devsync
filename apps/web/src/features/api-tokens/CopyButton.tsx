import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const copy = () =>
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Could not copy. Select the text and copy it manually.'));

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()} className="shrink-0">
      <Copy aria-hidden />
      {label}
    </Button>
  );
}
