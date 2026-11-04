import { TASK_PRIORITIES } from '@devsync/shared';
import { ArrowDownUp, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { humanize } from '@/lib/format';
import type { ProjectMember } from '@/lib/types';
import { isManualOrder, type BoardFilters, type SortKey } from './boardLogic';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'position', label: 'Manual order' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
];

const ALL = 'all';

/** Text input that reports its value after 300 ms of inactivity, and follows external URL changes. */
function DebouncedInput({
  label,
  value,
  placeholder,
  onCommit,
  type = 'search',
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
  type?: 'search' | 'text';
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onCommit(draft), 300);
    return () => clearTimeout(timer);
  }, [draft]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type={type}
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 w-56 pl-8"
      />
    </div>
  );
}

export function BoardToolbar({
  filters,
  members,
  onChange,
  onClear,
}: {
  filters: BoardFilters;
  members: ProjectMember[];
  onChange: (patch: Partial<BoardFilters>) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DebouncedInput
        label="Search tasks"
        placeholder="Search tasks…"
        value={filters.q}
        onCommit={(q) => onChange({ q })}
      />
      <Select value={filters.priority || ALL} onValueChange={(v) => onChange({ priority: v === ALL ? '' : (v as BoardFilters['priority']) })}>
        <SelectTrigger size="sm" aria-label="Filter by priority" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {humanize(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.assignee || ALL} onValueChange={(v) => onChange({ assignee: v === ALL ? '' : v })}>
        <SelectTrigger size="sm" aria-label="Filter by assignee" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Anyone</SelectItem>
          <SelectItem value="me">Me</SelectItem>
          <SelectItem value="none">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.userId} value={m.userId}>
              {m.user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DebouncedInput
        type="text"
        label="Filter by label"
        placeholder="Label name"
        value={filters.label}
        onCommit={(label) => onChange({ label })}
      />
      <Select value={filters.sort} onValueChange={(v) => onChange({ sort: v as SortKey })}>
        <SelectTrigger size="sm" aria-label="Sort by" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Sort ${filters.order === 'asc' ? 'ascending, switch to descending' : 'descending, switch to ascending'}`}
        onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
      >
        <ArrowDownUp aria-hidden />
      </Button>
      {!isManualOrder(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X aria-hidden />
          Clear filters
        </Button>
      )}
    </div>
  );
}
